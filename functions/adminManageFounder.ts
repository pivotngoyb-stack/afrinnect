import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, user_profile_id, email, trial_days, extend_days } = body;

    // Find user profile
    let profiles;
    if (user_profile_id) {
      profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: user_profile_id });
    } else if (email) {
      profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: email });
    }

    if (!profiles || profiles.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = profiles[0];

    switch (action) {
      case 'grant': {
        const days = trial_days || 183;
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          is_founding_member: true,
          founding_member_granted_at: now.toISOString(),
          founding_member_trial_ends_at: trialEndsAt.toISOString(),
          founding_member_source: 'manual_admin',
          founding_member_eligible: false,
          founding_trial_consumed: true,
          is_premium: true,
          subscription_tier: 'premium',
          premium_until: trialEndsAt.toISOString().split('T')[0],
          badges: [...(profile.badges || []).filter(b => b !== 'founding_member'), 'founding_member']
        });

        // Log admin action
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id,
          admin_email: user.email,
          action_type: 'user_edited',
          target_user_id: profile.user_id,
          details: { action: 'grant_founding_member', trial_days: days }
        });

        return Response.json({ success: true, action: 'granted', trial_ends_at: trialEndsAt.toISOString() });
      }

      case 'revoke': {
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          is_founding_member: false,
          is_premium: false,
          subscription_tier: 'free',
          premium_until: null,
          badges: (profile.badges || []).filter(b => b !== 'founding_member')
        });

        // Log admin action
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id,
          admin_email: user.email,
          action_type: 'user_edited',
          target_user_id: profile.user_id,
          details: { action: 'revoke_founding_member' }
        });

        return Response.json({ success: true, action: 'revoked' });
      }

      case 'extend': {
        if (!profile.founding_member_trial_ends_at) {
          return Response.json({ error: 'User does not have an active founding trial' }, { status: 400 });
        }

        const currentEndDate = new Date(profile.founding_member_trial_ends_at);
        const newEndDate = new Date(currentEndDate.getTime() + ((extend_days || 30) * 24 * 60 * 60 * 1000));

        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          founding_member_trial_ends_at: newEndDate.toISOString(),
          premium_until: newEndDate.toISOString().split('T')[0]
        });

        // Log admin action
        await base44.asServiceRole.entities.AdminAuditLog.create({
          admin_user_id: user.id,
          admin_email: user.email,
          action_type: 'user_edited',
          target_user_id: profile.user_id,
          details: { action: 'extend_founding_trial', extend_days: extend_days || 30 }
        });

        return Response.json({ success: true, action: 'extended', new_trial_ends_at: newEndDate.toISOString() });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Admin Manage Founder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});