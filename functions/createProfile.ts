import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.json();

    // 1. Check for existing profile
    const existingProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (existingProfiles.length > 0) {
        return Response.json({ error: 'Profile already exists' }, { status: 400 });
    }

    // 2. Validate Device/Phone Limits (Security)
    if (formData.phone_number) {
        const phoneCheck = await base44.asServiceRole.entities.UserProfile.filter({ phone_number: formData.phone_number });
        if (phoneCheck.length >= 2) {
             return Response.json({ error: 'Phone number limit reached' }, { status: 400 });
        }
    }

    const allUserProfiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: user.email });
    // Enforce strict one account per email policy
    if (allUserProfiles.length >= 1) {
         return Response.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    // 3. Prepare Secure Data
    const deviceId = formData.device_id || `web_${Date.now()}`;
    
    // 3.1 Check Founding Member Program Status
    let isFoundingMember = false;
    let founderTrialEndsAt = null;
    let founderSource = null;
    let founderCodeUsed = null;
    let trialDays = 3; // Default 3-day trial
    
    const founderSettingsRecords = await base44.asServiceRole.entities.SystemSettings.filter({ key: 'founder_program' });
    const founderSettings = founderSettingsRecords[0]?.value || {
      founders_mode_enabled: false,
      auto_assign_new_users: false,
      trial_days: 183
    };
    
    // Check if user provided an invite code
    if (formData.invite_code) {
      const codes = await base44.asServiceRole.entities.FounderInviteCode.filter({ 
        code: formData.invite_code.toUpperCase(),
        is_active: true
      });
      
      if (codes.length > 0) {
        const code = codes[0];
        const codeExpired = code.expires_at && new Date(code.expires_at) < new Date();
        const codeMaxed = code.current_redemptions >= code.max_redemptions;
        
        if (!codeExpired && !codeMaxed) {
          isFoundingMember = true;
          trialDays = code.trial_days || founderSettings.trial_days || 183;
          founderSource = 'invite_code';
          founderCodeUsed = code.code;
          
          // Increment redemption count
          await base44.asServiceRole.entities.FounderInviteCode.update(code.id, {
            current_redemptions: (code.current_redemptions || 0) + 1
          });
          
          // Record redemption
          await base44.asServiceRole.entities.FounderCodeRedemption.create({
            code_id: code.id,
            code: code.code,
            user_id: user.id,
            user_email: user.email,
            device_id: deviceId
          });
        }
      }
    }
    
    // Auto-assign if founders mode is enabled and auto-assign is on
    if (!isFoundingMember && founderSettings.founders_mode_enabled && founderSettings.auto_assign_new_users) {
      isFoundingMember = true;
      trialDays = founderSettings.trial_days || 183;
      founderSource = 'global_toggle';
    }
    
    // Calculate trial end date
    const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    if (isFoundingMember) {
      founderTrialEndsAt = trialExpiresAt;
    }

    // 2.1 Validate Age (Server-side Enforcement)
    if (formData.birth_date) {
        const birthDate = new Date(formData.birth_date);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs); 
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age < 18) {
             return Response.json({ error: 'You must be at least 18 years old to use this service.' }, { status: 400 });
        }
    } else {
        return Response.json({ error: 'Birth date is required' }, { status: 400 });
    }

    // 2.2 AI Content Safety Check (Fake Profiles / Hate Speech)
    if (formData.bio || formData.display_name) {
        try {
            const safetyCheck = await base44.integrations.Core.InvokeLLM({
                prompt: `Analyze this user profile data for safety:
                Name: "${formData.display_name}"
                Bio: "${formData.bio}"
                
                Detect:
                1. Fake profiles (celebrity names, nonsensical text)
                2. Hate speech or offensive content
                3. Solicitation or spam
                
                Return JSON: {"is_safe": boolean, "reason": "string"}`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        is_safe: { type: "boolean" },
                        reason: { type: "string" }
                    }
                }
            });

            if (!safetyCheck.is_safe) {
                return Response.json({ error: `Profile rejected: ${safetyCheck.reason}` }, { status: 400 });
            }
        } catch (e) {
            console.error("Profile safety check failed", e);
            // Fail open to avoid blocking legit users on AI error, but log it
        }
    }

    const allowedFields = {
        display_name: formData.display_name,
        birth_date: formData.birth_date,
        gender: formData.gender,
        looking_for: formData.looking_for,
        photos: formData.photos,
        primary_photo: formData.primary_photo,
        bio: formData.bio,
        country_of_origin: formData.country_of_origin,
        current_country: formData.current_country,
        current_state: formData.current_state,
        current_city: formData.current_city,
        tribe_ethnicity: formData.tribe_ethnicity,
        languages: formData.languages,
        religion: formData.religion,
        education: formData.education,
        profession: formData.profession,
        relationship_goal: formData.relationship_goal,
        height_cm: formData.height_cm,
        lifestyle: formData.lifestyle,
        cultural_values: formData.cultural_values,
        interests: formData.interests,
        prompts: formData.prompts,
        push_token: formData.push_token,
        phone_number: formData.phone_number
    };

    const newProfile = await base44.entities.UserProfile.create({
        ...allowedFields,
        user_id: user.id,
        // Force critical fields (User cannot override these)
        is_active: true,
        last_active: new Date().toISOString(),
        daily_likes_count: 0,
        daily_likes_reset_date: new Date().toISOString().split('T')[0],
        is_premium: true,
        subscription_tier: 'premium',
        premium_until: trialExpiresAt,
        // Founding Member Fields
        is_founding_member: isFoundingMember,
        founding_member_granted_at: isFoundingMember ? new Date().toISOString() : null,
        founding_member_trial_ends_at: founderTrialEndsAt,
        founding_member_source: founderSource,
        founding_member_code_used: founderCodeUsed,
        founding_member_eligible: !isFoundingMember, // If they're a founder, they've used their eligibility
        founding_trial_consumed: isFoundingMember,
        badges: isFoundingMember ? ['founding_member'] : [],
        verification_status: {
          email_verified: true, // Auto-verify email on signup as they own the account
          phone_verified: false,
          photo_verified: false,
          id_verified: false
        },
        device_ids: [deviceId],
        device_info: [{
          device_id: deviceId,
          device_name: formData.device_name || 'Web Browser',
          last_login: new Date().toISOString()
        }],
        // Reset potentially malicious fields
        violation_count: 0,
        warning_count: 0,
        is_banned: false,
        is_suspended: false
    });

    // 4. Post-Creation Actions (Async)
    // Welcome Email
    try {
        await base44.functions.invoke('sendWelcomeEmail', {
          user_email: user.email,
          user_name: formData.display_name
        });
    } catch (e) {}

    // Referral Logic
    if (formData.referred_by && formData.referred_by !== user.id) {
        try {
            // Validate referrer
            const referrers = await base44.asServiceRole.entities.User.filter({ id: formData.referred_by });
            if (referrers.length > 0) {
                // Create Referral Record
                await base44.asServiceRole.entities.Referral.create({
                    referrer_id: formData.referred_by,
                    referred_id: user.id,
                    referred_email: user.email,
                    status: 'completed',
                    reward_given: true,
                    reward_claimed: true
                });

                // Award Referrer (Extend Premium by 3 days)
                const referrerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: formData.referred_by });
                if (referrerProfiles.length > 0) {
                    const rProfile = referrerProfiles[0];
                    let newExpiry = new Date();
                    if (rProfile.premium_until && new Date(rProfile.premium_until) > new Date()) {
                        newExpiry = new Date(rProfile.premium_until);
                    }
                    newExpiry.setDate(newExpiry.getDate() + 3);
                    
                    await base44.asServiceRole.entities.UserProfile.update(rProfile.id, {
                        is_premium: true,
                        subscription_tier: rProfile.subscription_tier === 'free' ? 'premium' : rProfile.subscription_tier,
                        premium_until: newExpiry.toISOString()
                    });

                    // Notify Referrer
                    await base44.asServiceRole.entities.Notification.create({
                        user_profile_id: rProfile.id,
                        type: 'admin_message',
                        title: 'Referral Reward! 🎁',
                        message: `Your friend joined Afrinnect! You've earned 3 extra days of Premium access.`,
                        is_read: false
                    });
                }
            }
        } catch (e) {
            console.error('Referral processing failed:', e);
        }
    }

    return Response.json({ success: true, profile: newProfile });

  } catch (error) {
    console.error('Create Profile Error:', error);
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return Response.json({ error: 'Profile already exists' }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});