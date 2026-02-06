import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();

    // Get all founding members
    const foundingMembers = await base44.asServiceRole.entities.UserProfile.filter({
      is_founding_member: true
    });

    // Calculate stats
    const totalFounders = foundingMembers.length;
    
    let activeTrials = 0;
    let expiredTrials = 0;
    let converted = 0;
    let churned = 0;
    const trialEndingsSoon = [];

    for (const profile of foundingMembers) {
      const trialEnd = profile.founding_member_trial_ends_at ? new Date(profile.founding_member_trial_ends_at) : null;
      
      if (trialEnd) {
        if (trialEnd > now) {
          activeTrials++;
          
          // Check if ending in next 7 days
          const daysUntilExpiry = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 7) {
            trialEndingsSoon.push({
              profile_id: profile.id,
              display_name: profile.display_name,
              email: profile.created_by,
              days_remaining: daysUntilExpiry,
              trial_ends_at: profile.founding_member_trial_ends_at
            });
          }
        } else {
          expiredTrials++;
          
          if (profile.founding_member_converted) {
            converted++;
          } else if (!profile.is_premium) {
            churned++;
          }
        }
      }
    }

    // Get source breakdown
    const sourceBreakdown = {
      global_toggle: foundingMembers.filter(p => p.founding_member_source === 'global_toggle').length,
      invite_code: foundingMembers.filter(p => p.founding_member_source === 'invite_code').length,
      manual_admin: foundingMembers.filter(p => p.founding_member_source === 'manual_admin').length
    };

    // Get invite code stats
    const inviteCodes = await base44.asServiceRole.entities.FounderInviteCode.filter({});
    const codeStats = inviteCodes.map(code => ({
      code: code.code,
      redemptions: code.current_redemptions || 0,
      max: code.max_redemptions,
      is_active: code.is_active,
      expires_at: code.expires_at
    }));

    // Calculate conversion rate
    const conversionRate = expiredTrials > 0 ? Math.round((converted / expiredTrials) * 100) : 0;
    const churnRate = expiredTrials > 0 ? Math.round((churned / expiredTrials) * 100) : 0;

    return Response.json({
      total_founders: totalFounders,
      active_trials: activeTrials,
      expired_trials: expiredTrials,
      converted: converted,
      churned: churned,
      conversion_rate: conversionRate,
      churn_rate: churnRate,
      source_breakdown: sourceBreakdown,
      trial_ending_soon: trialEndingsSoon,
      invite_codes: codeStats
    });

  } catch (error) {
    console.error('Get Founder Stats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});