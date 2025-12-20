import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id, duration_seconds, call_quality } = await req.json();

    // Get user profile
    const userProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (userProfiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update video call record
    await base44.asServiceRole.entities.VideoCall.update(call_id, {
      status: 'ended',
      end_time: new Date().toISOString(),
      duration_seconds: duration_seconds || 0,
      call_quality: call_quality || 'good'
    });

    return Response.json({ 
      success: true 
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});