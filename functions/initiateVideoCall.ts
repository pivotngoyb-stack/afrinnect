import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id, receiver_profile_id } = await req.json();

    // Get caller profile
    const callerProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (callerProfiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const callerProfile = callerProfiles[0];

    // Check if caller is Elite or VIP
    if (!['elite', 'vip'].includes(callerProfile.subscription_tier)) {
      return Response.json({ 
        error: 'Video Calls require Elite or VIP membership' 
      }, { status: 403 });
    }

    // Generate unique room ID
    const roomId = `call_${match_id}_${Date.now()}`;

    // Create video call record
    const call = await base44.asServiceRole.entities.VideoCall.create({
      match_id,
      caller_profile_id: callerProfile.id,
      receiver_profile_id,
      status: 'initiated',
      start_time: new Date().toISOString(),
      room_id: roomId
    });

    // Send notification to receiver
    await base44.asServiceRole.entities.Notification.create({
      user_profile_id: receiver_profile_id,
      type: 'message',
      title: `${callerProfile.display_name} is calling you!`,
      message: 'Tap to join video call',
      from_profile_id: callerProfile.id
    });

    return Response.json({ 
      success: true, 
      call_id: call.id,
      room_id: roomId
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});