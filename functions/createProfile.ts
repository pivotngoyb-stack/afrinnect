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
    if (allUserProfiles.length >= 2) {
         return Response.json({ error: 'Account limit reached for this email' }, { status: 400 });
    }

    // 3. Prepare Secure Data
    const deviceId = formData.device_id || `web_${Date.now()}`;
    // 3-Day Trial (Server-side enforced)
    const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

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
    // (We handle this in backend to prevent tampering)
    // ... logic would go here if needed ...

    return Response.json({ success: true, profile: newProfile });

  } catch (error) {
    console.error('Create Profile Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});