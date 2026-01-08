import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import braintree from 'npm:braintree@3.23.0';

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Production,
  merchantId: Deno.env.get('BRAINTREE_MERCHANT_ID'),
  publicKey: Deno.env.get('BRAINTREE_PUBLIC_KEY'),
  privateKey: Deno.env.get('BRAINTREE_PRIVATE_KEY')
});

// EDGE CASE: Handle refunds and immediate access revocation
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { transaction_id, profile_id, reason } = await req.json();

    // Process refund with Braintree
    const result = await gateway.transaction.refund(transaction_id);

    if (result.success) {
      // Update subscription status
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_profile_id: profile_id,
        external_id: transaction_id
      });

      for (const sub of subs) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'refunded'
        });
      }

      // IMMEDIATE access revocation
      await base44.asServiceRole.entities.UserProfile.update(profile_id, {
        subscription_tier: 'free',
        is_premium: false,
        premium_until: null
      });

      // Kill active video calls
      const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
        $or: [
          { caller_profile_id: profile_id },
          { receiver_profile_id: profile_id }
        ],
        status: 'active'
      });

      // Parallelize calls update
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
        type: 'admin_message',
        title: 'Subscription Refunded',
        message: `Your subscription has been refunded. Premium access has been removed.${reason ? ` Reason: ${reason}` : ''}`,
        is_admin: true
      });

      // Log audit trail
      await base44.asServiceRole.entities.AdminAuditLog.create({
        admin_user_id: user.id,
        admin_email: user.email,
        action_type: 'subscription_cancelled',
        target_user_id: profile_id,
        details: {
          reason,
          transaction_id,
          refund_id: result.transaction.id
        }
      });

      return Response.json({ 
        success: true, 
        refund_id: result.transaction.id,
        message: 'Refund processed and access revoked'
      });
    } else {
      return Response.json({ 
        success: false, 
        error: result.message 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Refund error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});