import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id, receiver_profile_id, gift_type, gift_emoji, message } = await req.json();

    // Get sender profile
    const senderProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (senderProfiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const senderProfile = senderProfiles[0];

    // Check if sender is Elite or VIP
    if (!['elite', 'vip'].includes(senderProfile.subscription_tier)) {
      return Response.json({ 
        error: 'Virtual Gifts require Elite or VIP membership' 
      }, { status: 403 });
    }

    // Create virtual gift record
    const gift = await base44.asServiceRole.entities.VirtualGift.create({
      sender_profile_id: senderProfile.id,
      receiver_profile_id,
      match_id,
      gift_type,
      gift_emoji,
      message: message || '',
      cost: 0,
      status: 'sent'
    });

    // Send notification to receiver
    await base44.asServiceRole.entities.Notification.create({
      user_profile_id: receiver_profile_id,
      type: 'message',
      title: `${senderProfile.display_name} sent you a gift!`,
      message: `You received ${gift_emoji}`,
      from_profile_id: senderProfile.id
    });

    // Create message in chat
    await base44.asServiceRole.entities.Message.create({
      match_id,
      sender_id: senderProfile.id,
      receiver_id: receiver_profile_id,
      content: `Sent you a gift ${gift_emoji}${message ? ': ' + message : ''}`,
      message_type: 'text'
    });

    return Response.json({ 
      success: true, 
      gift 
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});