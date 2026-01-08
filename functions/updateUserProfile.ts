import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
        display_name, bio, birth_date, gender, photos, primary_photo,
        country_of_origin, current_country, current_city, tribe_ethnicity,
        languages, religion, education, profession, relationship_goal,
        height_cm, lifestyle, cultural_values, interests, looking_for,
        video_profile_url
    } = await req.json();

    // 1. Get existing profile
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles.length === 0) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    // 2. Allowed Updates (Strict Whitelist)
    // We explicitly EXCLUDE: is_premium, subscription_tier, is_banned, violation_count, etc.
    const updateData = {
        display_name,
        bio,
        birth_date,
        gender,
        photos,
        primary_photo,
        country_of_origin,
        current_country,
        current_city,
        tribe_ethnicity,
        languages,
        religion,
        education,
        profession,
        relationship_goal,
        height_cm,
        lifestyle,
        cultural_values,
        interests,
        looking_for,
        video_profile_url,
        // Helper fields
        is_active: true,
        last_active: new Date().toISOString()
    };

    // Remove undefined/null values to avoid overwriting with nulls if not sent
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // 3. Perform Update
    await base44.entities.UserProfile.update(profile.id, updateData);

    return Response.json({ success: true });

  } catch (error) {
    console.error('Update Profile Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});