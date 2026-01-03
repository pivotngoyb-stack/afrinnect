import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Call this function daily via cron or scheduled task
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active subscriptions
    const activeSubscriptions = await base44.asServiceRole.entities.Subscription.filter({
      status: 'active'
    });

    const today = new Date();
    let downgraded = 0;

    for (const sub of activeSubscriptions) {
      const endDate = new Date(sub.end_date);
      
      // Check if subscription expired
      if (endDate < today) {
        // Update subscription status
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'expired'
        });

        // Downgrade user profile
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          id: sub.user_profile_id
        });

        if (profiles.length > 0) {
          // EDGE CASE: Kill active video calls if subscription expires
          const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
            $or: [
              { caller_profile_id: sub.user_profile_id },
              { receiver_profile_id: sub.user_profile_id }
            ],
            status: 'active'
          });

          for (const call of activeCalls) {
            await base44.asServiceRole.entities.VideoCall.update(call.id, {
              status: 'ended',
              end_time: new Date().toISOString(),
              end_reason: 'subscription_expired'
            });
          }

          await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
            subscription_tier: 'free',
            is_premium: false,
            premium_until: null
          });

          // Notify user
          await base44.asServiceRole.entities.Notification.create({
            user_profile_id: sub.user_profile_id,
            type: 'admin_message',
            title: 'Premium Subscription Expired',
            message: 'Your premium subscription has expired. Upgrade to continue enjoying premium features!',
            is_admin: true
          });

          downgraded++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      checked: activeSubscriptions.length,
      downgraded 
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});