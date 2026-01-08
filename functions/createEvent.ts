import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
        title, description, event_type, image_url, start_date, end_date,
        is_virtual, virtual_link, location_name, location_address, city, country,
        max_attendees, price, currency, tags, is_featured
    } = await req.json();

    // 1. Validate User Eligibility
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const profile = profiles[0];

    // Check Premium or Verified
    const isPremium = profile.subscription_tier && profile.subscription_tier !== 'free';
    const isVerified = profile.verification_status?.photo_verified;

    if (!isPremium && !isVerified) {
        return Response.json({ error: 'Event creation is restricted to Premium or Verified members.' }, { status: 403 });
    }

    // 2. Validate "Featured" Status (VIP Only)
    const allowedFeatured = is_featured && profile.subscription_tier === 'vip';

    // 3. Create Event
    const event = await base44.entities.Event.create({
        title,
        description,
        event_type,
        image_url,
        start_date,
        end_date,
        is_virtual,
        virtual_link,
        location_name,
        location_address,
        city,
        country,
        organizer_id: profile.id,
        attendees: [profile.id], // Organizer automatically attends
        max_attendees: max_attendees ? parseInt(max_attendees) : null,
        price: parseFloat(price) || 0,
        currency: currency || 'USD',
        tags: tags || [],
        is_featured: allowedFeatured
    });

    // 4. Notify Organizer
    await base44.asServiceRole.entities.Notification.create({
        user_profile_id: profile.id,
        type: 'system',
        title: 'Event Published! 🎉',
        message: `Your event "${title}" is live.`,
        link_to: `EventDetails?id=${event.id}`
    });

    return Response.json({ success: true, event_id: event.id });

  } catch (error) {
    console.error('Create Event Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});