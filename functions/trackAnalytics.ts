import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { eventType, userId, properties } = await req.json();

    // Validate input
    if (!eventType) {
      return Response.json({ error: 'Event type required' }, { status: 400 });
    }

    // Create analytics entry
    await base44.asServiceRole.entities.ProfileAnalytics.create({
      user_profile_id: userId || 'anonymous',
      event_type: eventType,
      event_data: properties || {},
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});