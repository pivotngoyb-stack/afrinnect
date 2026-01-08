import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id } = await req.json();

    if (!match_id) {
        return Response.json({ error: 'Missing match_id' }, { status: 400 });
    }

    // 1. Get Match details to identify receiver
    const matches = await base44.entities.Match.filter({ id: match_id });
    if (matches.length === 0) {
        return Response.json({ error: 'Match not found' }, { status: 404 });
    }
    const match = matches[0];

    if (match.status !== 'active') {
        return Response.json({ error: 'Match is not active' }, { status: 400 });
    }
    
    // Determine roles
    // We need to know who the OTHER person is
    const userProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (userProfiles.length === 0) return Response.json({ error: 'Profile not found' }, { status: 404 });
    const myProfile = userProfiles[0];

    const receiver_profile_id = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;

    // 2. Check tier (Caller must be Elite/VIP)
    if (!['elite', 'vip'].includes(myProfile.subscription_tier)) {
      // Allow if they are RECEIVING a call (active call exists)? 
      // For now, let's enforce restriction on initiation only.
      // But we need to check if there's an existing call first.
    }

    // 3. Check for EXISTING active call
    // Status: initiated, ringing, connected
    const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
        match_id: match_id,
        status: { $in: ['initiated', 'ringing', 'connected'] }
    });

    // If active call exists, return it (Join existing)
    if (activeCalls.length > 0) {
        const call = activeCalls[0];
        // If I am the receiver, I can join regardless of my tier
        return Response.json({
            success: true,
            call_id: call.id,
            room_id: call.room_id,
            is_new: false
        });
    }

    // If NO active call, enforce tier requirement to START one
    if (!['elite', 'vip'].includes(myProfile.subscription_tier)) {
      return Response.json({ 
        error: 'Video Calls require Elite or VIP membership to initiate.' 
      }, { status: 403 });
    }

    // 4. Create NEW Call
    const roomId = `call_${match_id}_${crypto.randomUUID()}`;

    const call = await base44.asServiceRole.entities.VideoCall.create({
      match_id,
      caller_profile_id: myProfile.id,
      receiver_profile_id,
      status: 'initiated',
      start_time: new Date().toISOString(),
      room_id: roomId
    });

    // 5. Notify Receiver
    // We only notify if it's a NEW call
    await base44.asServiceRole.entities.Notification.create({
      user_profile_id: receiver_profile_id,
      type: 'message', // Using 'message' type for generic handling or 'video_call' if supported
      title: 'Incoming Video Call 🎥',
      message: `${myProfile.display_name} is calling you! Tap to join.`,
      from_profile_id: myProfile.id,
      link_to: `VideoChat?matchId=${match_id}`
    });

    // Push Notification
    try {
        await base44.functions.invoke('sendPushNotification', {
            user_profile_id: receiver_profile_id,
            title: 'Incoming Video Call 🎥',
            body: `${myProfile.display_name} is calling you!`,
            type: 'video_call',
            data: { matchId: match_id, roomId: roomId }
        });
    } catch (e) {
        console.error("Push failed", e);
    }

    return Response.json({ 
      success: true, 
      call_id: call.id,
      room_id: roomId,
      is_new: true
    });

  } catch (error) {
    console.error("Initiate Call Error:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});