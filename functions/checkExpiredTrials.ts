import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Check and downgrade expired premium trials
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all premium users whose trial has expired
    const now = new Date().toISOString();
    const expiredTrials = await base44.asServiceRole.entities.UserProfile.filter({
      subscription_tier: 'premium',
      premium_until: { $lt: now }
    });

    let downgraded = 0;
    
    for (const profile of expiredTrials) {
      // Downgrade to free tier
      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        is_premium: false,
        subscription_tier: 'free',
        premium_until: null
      });

      // Send notification
      await base44.asServiceRole.entities.Notification.create({
        user_profile_id: profile.id,
        type: 'admin_message',
        title: 'Your Premium Trial Has Ended',
        message: 'Thanks for trying Premium! Upgrade now to continue enjoying unlimited likes, profile boosts, and more.',
        link_to: 'PricingPlans',
        is_admin: true
      });

      downgraded++;
    }

    return Response.json({
      success: true,
      message: `Downgraded ${downgraded} expired trials`,
      downgraded
    });
  } catch (error) {
    console.error('Check expired trials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});