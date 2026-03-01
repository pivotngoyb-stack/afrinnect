import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@^14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { immediate = false, reason } = await req.json();

    // Find user's profile
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (!profiles.length) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    // Find active subscription
    const activeSubs = await base44.entities.Subscription.filter({
      user_profile_id: profile.id,
      status: 'active'
    });

    if (activeSubs.length === 0) {
      return Response.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const subscription = activeSubs[0];
    let stripeResult = null;

    // Cancel in Stripe
    if (subscription.payment_provider === 'stripe' && subscription.external_id) {
      try {
        if (immediate) {
          // Immediate cancellation - no more access
          stripeResult = await stripe.subscriptions.cancel(subscription.external_id, {
            prorate: true
          });
        } else {
          // Cancel at period end - keep access until end date
          stripeResult = await stripe.subscriptions.update(subscription.external_id, {
            cancel_at_period_end: true,
            metadata: {
              cancellation_reason: reason || 'User requested'
            }
          });
        }
      } catch (stripeError) {
        console.error("Stripe cancellation failed:", stripeError);
        // If subscription already cancelled or doesn't exist, proceed
        if (!stripeError.message.includes('No such subscription')) {
          return Response.json({ 
            error: 'Failed to cancel with payment provider',
            details: stripeError.message 
          }, { status: 500 });
        }
      }
    }

    // Update in DB
    if (immediate) {
      // Immediate: revoke access now
      await base44.asServiceRole.entities.Subscription.update(subscription.id, {
        status: 'cancelled',
        auto_renew: false
      });

      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        subscription_tier: 'free',
        is_premium: false,
        premium_until: null,
        incognito_mode: false,
        monthly_gifts_remaining: 0,
        priority_dm_enabled: false
      });
    } else {
      // End of period: keep access, just disable renewal
      await base44.asServiceRole.entities.Subscription.update(subscription.id, {
        auto_renew: false
      });
    }

    // Log the cancellation
    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_user_id: user.id,
      admin_email: user.email,
      action_type: 'subscription_cancelled',
      target_user_id: profile.id,
      details: {
        reason: reason || 'User initiated',
        immediate,
        subscription_id: subscription.id,
        plan_type: subscription.plan_type,
        end_date: subscription.end_date
      }
    });

    // Send confirmation email
    try {
      const endDate = new Date(subscription.end_date);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Subscription Cancellation Confirmed - Afrinnect',
        body: `
Hi ${profile.display_name},

Your subscription cancellation has been confirmed.

${immediate 
  ? 'Your premium access has been removed immediately.' 
  : `You will continue to have access to all premium features until ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
}

We're sorry to see you go! If you change your mind, you can resubscribe anytime from the app.

If you have any feedback on how we can improve, we'd love to hear from you.

Best regards,
The Afrinnect Team
        `.trim()
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_profile_id: profile.id,
      user_id: user.id,
      type: 'admin_message',
      title: 'Subscription Cancelled',
      message: immediate 
        ? 'Your subscription has been cancelled and premium access removed.'
        : `Your subscription will end on ${new Date(subscription.end_date).toLocaleDateString()}. You'll keep premium access until then.`,
      is_admin: true
    });

    return Response.json({ 
      success: true, 
      immediate,
      end_date: immediate ? new Date().toISOString() : subscription.end_date,
      message: immediate 
        ? 'Subscription cancelled immediately.'
        : 'Subscription will be cancelled at the end of the billing period.',
      stripe_status: stripeResult?.status
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});