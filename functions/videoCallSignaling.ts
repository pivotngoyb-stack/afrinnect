import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// TURN/STUN server configuration for production
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Free TURN servers for production (consider upgrading to paid TURN for scale)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// Rate limiting: max 10 calls per user per hour
const CALL_RATE_LIMIT = 10;
const CALL_RATE_WINDOW_HOURS = 1;
const CALL_TIMEOUT_SECONDS = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action } = payload;

    // Get user profile
    const userProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (userProfiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const myProfile = userProfiles[0];

    switch (action) {
      case 'initiate':
        return await handleInitiate(base44, user, myProfile, payload);
      case 'answer':
        return await handleAnswer(base44, user, myProfile, payload);
      case 'decline':
        return await handleDecline(base44, user, myProfile, payload);
      case 'ice_candidate':
        return await handleIceCandidate(base44, user, myProfile, payload);
      case 'end':
        return await handleEnd(base44, user, myProfile, payload);
      case 'get_call':
        return await handleGetCall(base44, user, myProfile, payload);
      case 'update_status':
        return await handleUpdateStatus(base44, user, myProfile, payload);
      case 'check_busy':
        return await handleCheckBusy(base44, user, myProfile, payload);
      case 'report':
        return await handleReport(base44, user, myProfile, payload);
      case 'block':
        return await handleBlock(base44, user, myProfile, payload);
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error("Video Call Signaling Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleInitiate(base44, user, myProfile, payload) {
  const { match_id, call_type = 'video' } = payload;

  if (!match_id) {
    return Response.json({ error: 'Missing match_id' }, { status: 400 });
  }

  // Check tier (Elite/VIP required to initiate)
  if (!['elite', 'vip'].includes(myProfile.subscription_tier)) {
    return Response.json({ 
      error: 'Video calls require Elite or VIP membership' 
    }, { status: 403 });
  }

  // Rate limiting check
  const oneHourAgo = new Date(Date.now() - CALL_RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const recentCalls = await base44.asServiceRole.entities.VideoCall.filter({
    caller_profile_id: myProfile.id,
    start_time: { $gte: oneHourAgo }
  });

  if (recentCalls.length >= CALL_RATE_LIMIT) {
    return Response.json({ 
      error: 'Call rate limit exceeded. Please wait before making more calls.' 
    }, { status: 429 });
  }

  // Get match
  const matches = await base44.entities.Match.filter({ id: match_id });
  if (matches.length === 0) {
    return Response.json({ error: 'Match not found' }, { status: 404 });
  }
  const match = matches[0];

  if (match.status !== 'active') {
    return Response.json({ error: 'Match is not active' }, { status: 400 });
  }

  // Determine receiver
  const receiver_profile_id = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;
  const receiver_user_id = match.user1_id === myProfile.id ? match.user2_user_id : match.user1_user_id;

  // Check if receiver is blocked
  if (myProfile.blocked_users?.includes(receiver_profile_id)) {
    return Response.json({ error: 'Cannot call blocked user' }, { status: 400 });
  }

  // Check if receiver has blocked caller
  const receiverProfiles = await base44.asServiceRole.entities.UserProfile.filter({ id: receiver_profile_id });
  if (receiverProfiles.length > 0 && receiverProfiles[0].blocked_users?.includes(myProfile.id)) {
    return Response.json({ error: 'Call not available' }, { status: 400 });
  }

  // Check if receiver is busy (in another call)
  const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
    $or: [
      { caller_profile_id: receiver_profile_id },
      { receiver_profile_id: receiver_profile_id }
    ],
    status: { $in: ['initiated', 'ringing', 'connecting', 'connected'] }
  });

  if (activeCalls.length > 0) {
    return Response.json({ 
      status: 'busy',
      error: 'User is currently in another call' 
    }, { status: 200 });
  }

  // Check for existing call in this match
  const existingCalls = await base44.asServiceRole.entities.VideoCall.filter({
    match_id,
    status: { $in: ['initiated', 'ringing', 'connecting', 'connected'] }
  });

  if (existingCalls.length > 0) {
    // Return existing call
    return Response.json({
      success: true,
      call_id: existingCalls[0].id,
      room_id: existingCalls[0].room_id,
      ice_servers: ICE_SERVERS,
      is_new: false,
      status: existingCalls[0].status
    });
  }

  // Create new call
  const roomId = `call_${match_id}_${crypto.randomUUID().split('-')[0]}`;

  const call = await base44.asServiceRole.entities.VideoCall.create({
    match_id,
    caller_profile_id: myProfile.id,
    caller_user_id: user.id,
    receiver_profile_id,
    receiver_user_id,
    status: 'initiated',
    call_type,
    start_time: new Date().toISOString(),
    room_id: roomId,
    caller_ice_candidates: [],
    receiver_ice_candidates: []
  });

  // Send push notification to receiver
  try {
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_profile_id: receiver_profile_id,
      title: call_type === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Call',
      body: `${myProfile.display_name} is calling you`,
      type: 'video_call',
      data: { 
        matchId: match_id, 
        callId: call.id,
        callType: call_type,
        callerName: myProfile.display_name,
        callerPhoto: myProfile.primary_photo
      }
    });
  } catch (e) {
    console.error("Push notification failed:", e);
  }

  // Create in-app notification
  await base44.asServiceRole.entities.Notification.create({
    user_profile_id: receiver_profile_id,
    user_id: receiver_user_id,
    type: 'message',
    title: call_type === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Call',
    message: `${myProfile.display_name} is calling you`,
    from_profile_id: myProfile.id,
    link_to: `VideoChat?matchId=${match_id}&callId=${call.id}`
  });

  return Response.json({
    success: true,
    call_id: call.id,
    room_id: roomId,
    ice_servers: ICE_SERVERS,
    is_new: true,
    timeout_seconds: CALL_TIMEOUT_SECONDS
  });
}

async function handleAnswer(base44, user, myProfile, payload) {
  const { call_id, sdp } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is the receiver
  if (call.receiver_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Check call is still valid
  if (!['initiated', 'ringing'].includes(call.status)) {
    return Response.json({ error: 'Call is no longer available', status: call.status }, { status: 400 });
  }

  // Update call with answer
  await base44.asServiceRole.entities.VideoCall.update(call_id, {
    status: 'connecting',
    receiver_sdp: sdp,
    answered_time: new Date().toISOString()
  });

  return Response.json({
    success: true,
    ice_servers: ICE_SERVERS,
    caller_sdp: call.caller_sdp
  });
}

async function handleDecline(base44, user, myProfile, payload) {
  const { call_id } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  await base44.asServiceRole.entities.VideoCall.update(call_id, {
    status: 'declined',
    end_time: new Date().toISOString(),
    end_reason: 'declined'
  });

  return Response.json({ success: true });
}

async function handleIceCandidate(base44, user, myProfile, payload) {
  const { call_id, candidate, is_caller } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const field = is_caller ? 'caller_ice_candidates' : 'receiver_ice_candidates';
  const existing = call[field] || [];

  await base44.asServiceRole.entities.VideoCall.update(call_id, {
    [field]: [...existing, candidate]
  });

  return Response.json({ success: true });
}

async function handleEnd(base44, user, myProfile, payload) {
  const { call_id, duration_seconds, network_stats, end_reason = 'completed' } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Calculate quality from network stats
  let call_quality = 'good';
  if (network_stats) {
    if (network_stats.packet_loss > 5 || network_stats.latency_ms > 300) {
      call_quality = 'poor';
    } else if (network_stats.packet_loss > 2 || network_stats.latency_ms > 150) {
      call_quality = 'fair';
    } else if (network_stats.packet_loss < 0.5 && network_stats.latency_ms < 50) {
      call_quality = 'excellent';
    }
  }

  await base44.asServiceRole.entities.VideoCall.update(call_id, {
    status: 'ended',
    end_time: new Date().toISOString(),
    duration_seconds: duration_seconds || 0,
    network_stats,
    call_quality,
    end_reason
  });

  return Response.json({ success: true });
}

async function handleGetCall(base44, user, myProfile, payload) {
  const { call_id, match_id } = payload;

  let call;
  if (call_id) {
    const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
    call = calls[0];
  } else if (match_id) {
    const calls = await base44.asServiceRole.entities.VideoCall.filter({
      match_id,
      status: { $in: ['initiated', 'ringing', 'connecting', 'connected', 'reconnecting'] }
    }, '-created_date', 1);
    call = calls[0];
  }

  if (!call) {
    return Response.json({ call: null });
  }

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const isCaller = call.caller_profile_id === myProfile.id;

  return Response.json({
    call: {
      id: call.id,
      status: call.status,
      call_type: call.call_type,
      room_id: call.room_id,
      is_caller: isCaller,
      remote_sdp: isCaller ? call.receiver_sdp : call.caller_sdp,
      remote_ice_candidates: isCaller ? call.receiver_ice_candidates : call.caller_ice_candidates,
      start_time: call.start_time,
      answered_time: call.answered_time
    },
    ice_servers: ICE_SERVERS
  });
}

async function handleUpdateStatus(base44, user, myProfile, payload) {
  const { call_id, status, sdp } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const update = { status };
  
  if (sdp) {
    const isCaller = call.caller_profile_id === myProfile.id;
    update[isCaller ? 'caller_sdp' : 'receiver_sdp'] = sdp;
  }

  await base44.asServiceRole.entities.VideoCall.update(call_id, update);

  return Response.json({ success: true });
}

async function handleCheckBusy(base44, user, myProfile, payload) {
  const { profile_id } = payload;

  const activeCalls = await base44.asServiceRole.entities.VideoCall.filter({
    $or: [
      { caller_profile_id: profile_id },
      { receiver_profile_id: profile_id }
    ],
    status: { $in: ['initiated', 'ringing', 'connecting', 'connected'] }
  });

  return Response.json({ 
    busy: activeCalls.length > 0 
  });
}

async function handleReport(base44, user, myProfile, payload) {
  const { call_id, reason } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const reportedProfileId = call.caller_profile_id === myProfile.id 
    ? call.receiver_profile_id 
    : call.caller_profile_id;

  // Create report
  await base44.asServiceRole.entities.Report.create({
    reporter_id: myProfile.id,
    reported_id: reportedProfileId,
    reason: reason || 'inappropriate_behavior',
    category: 'video_call',
    description: `Reported during video call ${call_id}`,
    status: 'pending'
  });

  // Mark call as reported
  await base44.asServiceRole.entities.VideoCall.update(call_id, { reported: true });

  return Response.json({ success: true });
}

async function handleBlock(base44, user, myProfile, payload) {
  const { call_id } = payload;

  const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
  if (calls.length === 0) {
    return Response.json({ error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];

  // Verify user is participant
  if (call.receiver_profile_id !== myProfile.id && call.caller_profile_id !== myProfile.id) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const blockProfileId = call.caller_profile_id === myProfile.id 
    ? call.receiver_profile_id 
    : call.caller_profile_id;

  // Add to blocked users
  const blockedUsers = myProfile.blocked_users || [];
  if (!blockedUsers.includes(blockProfileId)) {
    blockedUsers.push(blockProfileId);
    await base44.entities.UserProfile.update(myProfile.id, { blocked_users: blockedUsers });
  }

  // End call immediately
  await base44.asServiceRole.entities.VideoCall.update(call_id, {
    status: 'ended',
    end_time: new Date().toISOString(),
    end_reason: 'blocked',
    blocked_during_call: true
  });

  return Response.json({ success: true });
}