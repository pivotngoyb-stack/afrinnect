import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check for expired subscriptions
    const now = new Date().toISOString();
    const expiredSubs = await base44.asServiceRole.entities.Subscription.filter({
      status: 'active',
      end_date: { $lt: now }
    });
    
    const results = [];
    
    for (const sub of expiredSubs) {
      // Update subscription status
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: 'expired'
      });
      
      // Downgrade user profile
      await base44.asServiceRole.entities.UserProfile.update(sub.user_profile_id, {
        subscription_tier: 'free',
        is_premium: false,
        premium_until: null,
        incognito_mode: false, // Disable premium features
        profile_boost_active: false
      });
      
      // Send notification
      await base44.asServiceRole.entities.Notification.create({
        user_profile_id: sub.user_profile_id,
        type: 'admin_message',
        title: 'Subscription Expired',
        message: 'Your premium subscription has expired. Upgrade to continue enjoying premium features!',
        is_admin: true
      });
      
      results.push({
        subscription_id: sub.id,
        user_profile_id: sub.user_profile_id,
        downgraded: true
      });
    }
    
    return Response.json({
      success: true,
      expired_count: expiredSubs.length,
      results
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});