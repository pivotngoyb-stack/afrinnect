import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // This can be called by admin or by scheduled automation
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();

    // Find all founding members whose trial has expired
    const allFoundingMembers = await base44.asServiceRole.entities.UserProfile.filter({
      is_founding_member: true
    });

    const expiredProfiles = allFoundingMembers.filter(profile => {
      if (!profile.founding_member_trial_ends_at) return false;
      const trialEnd = new Date(profile.founding_member_trial_ends_at);
      return trialEnd < now;
    });

    let processedCount = 0;
    const results = [];

    for (const profile of expiredProfiles) {
      // Check if they have an active paid subscription
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        user_profile_id: profile.id,
        status: 'active'
      });

      const hasActiveSubscription = subscriptions.length > 0;

      if (hasActiveSubscription) {
        // They converted - update flag
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          founding_member_converted: true,
          founding_member_converted_at: now.toISOString()
        });
        results.push({ profile_id: profile.id, action: 'converted' });
      } else {
        // Downgrade to free
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          is_premium: false,
          subscription_tier: 'free',
          premium_until: null
        });
        results.push({ profile_id: profile.id, action: 'downgraded' });
      }

      processedCount++;
    }

    return Response.json({
      success: true,
      processed: processedCount,
      results
    });

  } catch (error) {
    console.error('Check Expired Founder Trials error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});