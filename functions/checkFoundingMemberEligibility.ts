import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Founder Program Settings
    const settingsRecords = await base44.asServiceRole.entities.SystemSettings.filter({ key: 'founder_program' });
    const settings = settingsRecords[0]?.value || {
      founders_mode_enabled: false,
      auto_assign_new_users: false,
      trial_days: 183
    };

    // Get user profile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id });
    
    if (profiles.length === 0) {
      // New user - check if eligible
      return Response.json({
        eligible: settings.founders_mode_enabled && settings.auto_assign_new_users,
        is_founding_member: false,
        trial_consumed: false,
        program_active: settings.founders_mode_enabled,
        auto_assign_enabled: settings.auto_assign_new_users,
        trial_days: settings.trial_days
      });
    }

    const profile = profiles[0];

    // Check if trial already consumed
    if (profile.founding_trial_consumed) {
      return Response.json({
        eligible: false,
        is_founding_member: profile.is_founding_member,
        trial_consumed: true,
        trial_ends_at: profile.founding_member_trial_ends_at,
        program_active: settings.founders_mode_enabled
      });
    }

    // Check if already a founding member
    if (profile.is_founding_member) {
      return Response.json({
        eligible: false,
        is_founding_member: true,
        trial_consumed: true,
        trial_ends_at: profile.founding_member_trial_ends_at,
        source: profile.founding_member_source,
        program_active: settings.founders_mode_enabled
      });
    }

    // User is eligible
    return Response.json({
      eligible: profile.founding_member_eligible !== false && settings.founders_mode_enabled,
      is_founding_member: false,
      trial_consumed: false,
      program_active: settings.founders_mode_enabled,
      auto_assign_enabled: settings.auto_assign_new_users,
      trial_days: settings.trial_days
    });

  } catch (error) {
    console.error('Check Founding Member eligibility error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});