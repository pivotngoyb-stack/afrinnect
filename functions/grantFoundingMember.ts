import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_profile_id, invite_code, device_id, source = 'global_toggle' } = body;

    // Get Founder Program Settings
    const settingsRecords = await base44.asServiceRole.entities.SystemSettings.filter({ key: 'founder_program' });
    const settings = settingsRecords[0]?.value || {
      founders_mode_enabled: false,
      auto_assign_new_users: false,
      trial_days: 183
    };

    // Get the user profile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      id: user_profile_id || undefined,
      user_id: user_profile_id ? undefined : user.id
    });
    
    if (profiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profiles[0];

    // Check if trial already consumed (prevents reinstall abuse)
    if (profile.founding_trial_consumed) {
      return Response.json({ 
        error: 'Founding Member trial already used',
        already_consumed: true 
      }, { status: 400 });
    }

    // Check eligibility
    if (profile.founding_member_eligible === false) {
      return Response.json({ 
        error: 'User not eligible for Founding Member status',
        not_eligible: true 
      }, { status: 400 });
    }

    let trialDays = settings.trial_days || 183;
    let finalSource = source;
    let codeUsed = null;

    // Handle invite code redemption
    if (invite_code) {
      const codes = await base44.asServiceRole.entities.FounderInviteCode.filter({ 
        code: invite_code.toUpperCase(),
        is_active: true
      });

      if (codes.length === 0) {
        return Response.json({ error: 'Invalid or expired invite code' }, { status: 400 });
      }

      const code = codes[0];

      // Check expiration
      if (code.expires_at && new Date(code.expires_at) < new Date()) {
        return Response.json({ error: 'Invite code has expired' }, { status: 400 });
      }

      // Check max redemptions
      if (code.current_redemptions >= code.max_redemptions) {
        return Response.json({ error: 'Invite code has reached max redemptions' }, { status: 400 });
      }

      // Use code's custom trial days if set
      trialDays = code.trial_days || trialDays;
      finalSource = 'invite_code';
      codeUsed = code.code;

      // Record redemption
      await base44.asServiceRole.entities.FounderCodeRedemption.create({
        code_id: code.id,
        code: code.code,
        user_id: user.id,
        user_email: user.email,
        device_id: device_id || null
      });

      // Increment redemption count
      await base44.asServiceRole.entities.FounderInviteCode.update(code.id, {
        current_redemptions: (code.current_redemptions || 0) + 1
      });

    } else if (!settings.founders_mode_enabled) {
      // No invite code and founders mode is off
      return Response.json({ 
        error: 'Founding Member program is not currently active',
        program_inactive: true 
      }, { status: 400 });
    }

    // Calculate trial end date
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));

    // Grant Founding Member status
    const updateData = {
      is_founding_member: true,
      founding_member_granted_at: now.toISOString(),
      founding_member_trial_ends_at: trialEndsAt.toISOString(),
      founding_member_source: finalSource,
      founding_member_code_used: codeUsed,
      founding_member_eligible: false,
      founding_trial_consumed: true,
      is_premium: true,
      subscription_tier: 'premium',
      premium_until: trialEndsAt.toISOString().split('T')[0],
      badges: [...(profile.badges || []).filter(b => b !== 'founding_member'), 'founding_member']
    };

    await base44.asServiceRole.entities.UserProfile.update(profile.id, updateData);

    return Response.json({
      success: true,
      is_founding_member: true,
      trial_ends_at: trialEndsAt.toISOString(),
      trial_days: trialDays,
      source: finalSource
    });

  } catch (error) {
    console.error('Grant Founding Member error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});