import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// EDGE CASE HANDLER: Upgrade/Downgrade logic with proper feature management
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, new_tier, profile_id } = await req.json();
    // action: 'upgrade', 'downgrade', 'refund', 'expire'

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      id: profile_id 
    });

    if (profiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profiles[0];
    const oldTier = profile.subscription_tier;

    // EDGE CASE 1: Upgrade → Downgrade (preserve old features if paid)
    if (action === 'downgrade') {
      // Get active subscription
      const activeSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_profile_id: profile_id,
        status: 'active'
      }, '-created_date', 1);

      if (activeSubs.length > 0) {
        const sub = activeSubs[0];
        
        // Mark current subscription as cancelled (but active until end_date)
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'cancelled',
          auto_renew: false
        });

        // Notify user: Features remain until expiry
        await base44.asServiceRole.entities.Notification.create({
          user_profile_id: profile_id,
          type: 'admin_message',
          title: 'Subscription Downgraded',
          message: `Your ${oldTier} features will remain active until ${new Date(sub.end_date).toLocaleDateString()}. After that, you'll be on the ${new_tier} plan.`,
          is_admin: true
        });

        return Response.json({ 
          success: true, 
          message: 'Downgrade scheduled',
          active_until: sub.end_date
        });
      }
    }

    // EDGE CASE 2: Downgrade → Upgrade (immediate)
    if (action === 'upgrade') {
      // Cancel old subscription
      const activeSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_profile_id: profile_id,
        status: 'active'
      });

      for (const sub of activeSubs) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'cancelled'
        });
      }

      // Upgrade immediately (handled by checkout flow)
      await base44.asServiceRole.entities.UserProfile.update(profile_id, {
        subscription_tier: new_tier,
        is_premium: ['premium', 'elite', 'vip'].includes(new_tier)
      });

      await base44.asServiceRole.entities.Notification.create({
        user_profile_id: profile_id,
        type: 'admin_message',
        title: 'Subscription Upgraded! 🎉',
        message: `Welcome to ${new_tier.toUpperCase()}! Your new features are active now.`,
        is_admin: true
      });

      return Response.json({ success: true, message: 'Upgraded immediately' });
    }

    // EDGE CASE 3: Refund → Revoke access immediately
    if (action === 'refund') {
      // Mark all subscriptions as refunded
      const allSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_profile_id: profile_id
      });

      for (const sub of allSubs) {
        if (sub.status === 'active' || sub.status === 'cancelled') {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            status: 'refunded'
          });
        }
      }

      // IMMEDIATE downgrade
      await base44.asServiceRole.entities.UserProfile.update(profile_id, {
        subscription_tier: 'free',
        is_premium: false,
        premium_until: null
      });

      // Kill any active video calls
      const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
        $or: [
          { caller_profile_id: profile_id },
          { receiver_profile_id: profile_id }
        ],
        status: 'active'
      });

      for (const call of activeCalls) {
        await base44.asServiceRole.entities.VideoCall.update(call.id, {
          status: 'ended',
          end_time: new Date().toISOString(),
          end_reason: 'subscription_refunded'
        });
      }

      await base44.asServiceRole.entities.Notification.create({
        user_profile_id: profile_id,
        type: 'admin_message',
        title: 'Subscription Refunded',
        message: 'Your subscription has been refunded. Premium access has been removed.',
        is_admin: true
      });

      return Response.json({ success: true, message: 'Access revoked immediately' });
    }

    // EDGE CASE 4: Expiration during video call
    if (action === 'expire') {
      // Check for active calls
      const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
        $or: [
          { caller_profile_id: profile_id },
          { receiver_profile_id: profile_id }
        ],
        status: 'active'
      });

      // Grace period: let call finish, but block new calls
      for (const call of activeCalls) {
        // Mark profile as expiring soon (frontend will show warning)
        await base44.asServiceRole.entities.UserProfile.update(profile_id, {
          subscription_tier: 'free',
          is_premium: false,
          premium_until: null
        });
      }

      return Response.json({ success: true, message: 'Expired with grace period' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Subscription change error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});