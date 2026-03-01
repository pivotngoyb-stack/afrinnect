import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@^14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// Handle refunds with immediate access revocation
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { profile_id, subscription_id, reason, refund_type = 'full' } = await req.json();

    if (!profile_id) {
      return Response.json({ error: 'profile_id is required' }, { status: 400 });
    }

    // Get the user's profile and subscription
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: profile_id });
    if (profiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    // Find active subscription
    let subscription;
    if (subscription_id) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ id: subscription_id });
      subscription = subs[0];
    } else {
      const activeSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_profile_id: profile_id,
        status: 'active'
      });
      subscription = activeSubs[0];
    }

    if (!subscription) {
      return Response.json({ error: 'No active subscription found' }, { status: 404 });
    }

    let refundResult = { success: true, refund_id: null };

    // Process Stripe refund if applicable
    if (subscription.payment_provider === 'stripe' && subscription.external_id) {
      try {
        // Get the subscription from Stripe to find the latest invoice
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.external_id);
        const latestInvoiceId = stripeSubscription.latest_invoice;

        if (latestInvoiceId && typeof latestInvoiceId === 'string') {
          const invoice = await stripe.invoices.retrieve(latestInvoiceId);
          const chargeId = invoice.charge;

          if (chargeId && typeof chargeId === 'string') {
            // Create refund
            const refund = await stripe.refunds.create({
              charge: chargeId,
              reason: 'requested_by_customer',
              metadata: {
                profile_id,
                admin_email: user.email,
                reason: reason || 'Admin initiated refund'
              }
            });
            refundResult.refund_id = refund.id;
          }
        }

        // Cancel the Stripe subscription immediately
        await stripe.subscriptions.cancel(subscription.external_id, {
          prorate: true
        });
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        // Continue with local updates even if Stripe fails
        refundResult.stripe_error = stripeError.message;
      }
    }

    // Update subscription status
    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
      status: 'refunded',
      auto_renew: false
    });

    // IMMEDIATE access revocation
    await base44.asServiceRole.entities.UserProfile.update(profile_id, {
      subscription_tier: 'free',
      is_premium: false,
      premium_until: null,
      incognito_mode: false,
      monthly_gifts_remaining: 0,
      priority_dm_enabled: false
    });

    // End any active video calls
    const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
      $or: [
        { caller_profile_id: profile_id },
        { receiver_profile_id: profile_id }
      ],
      status: { $in: ['initiated', 'ringing', 'connecting', 'connected'] }
    });

    await Promise.all(activeCalls.map(call => 
      base44.asServiceRole.entities.VideoCall.update(call.id, {
        status: 'ended',
        end_time: new Date().toISOString(),
        end_reason: 'subscription_refunded'
      })
    ));

    // Notify user
    await base44.asServiceRole.entities.Notification.create({
      user_profile_id: profile_id,
      user_id: profile.user_id,
      type: 'admin_message',
      title: 'Subscription Refunded',
      message: `Your subscription has been refunded and premium access removed.${reason ? ` Reason: ${reason}` : ''}`,
      is_admin: true
    });

    // Send email notification
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: profile.created_by,
        subject: 'Subscription Refund Processed - Afrinnect',
        body: `
Hi ${profile.display_name},

Your subscription has been refunded.

${reason ? `Reason: ${reason}` : ''}

Your account has been downgraded to the free tier. You can upgrade again anytime from the app.

If you have questions, please contact our support team.

Best regards,
The Afrinnect Team
        `.trim()
      });
    } catch (emailError) {
      console.error('Failed to send refund email:', emailError);
    }

    // Log audit trail
    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_user_id: user.id,
      admin_email: user.email,
      action_type: 'subscription_refund',
      target_user_id: profile_id,
      details: {
        reason,
        subscription_id: subscription.id,
        refund_id: refundResult.refund_id,
        refund_type,
        previous_tier: subscription.plan_type,
        stripe_error: refundResult.stripe_error
      }
    });

    // Create receipt record
    await base44.asServiceRole.entities.Receipt.create({
      user_profile_id: profile_id,
      type: 'refund',
      amount: subscription.amount_paid || 0,
      currency: subscription.currency || 'USD',
      description: `Refund for ${subscription.plan_type}`,
      transaction_id: refundResult.refund_id,
      status: 'completed'
    });

    return Response.json({ 
      success: true, 
      refund_id: refundResult.refund_id,
      message: 'Refund processed and access revoked',
      stripe_error: refundResult.stripe_error
    });

  } catch (error) {
    console.error('Refund error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});