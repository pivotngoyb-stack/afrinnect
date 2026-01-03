import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ENGAGEMENT: Send nudges for inactive matches (24-48h silence)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin-only automation endpoint
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Find matches with no messages in 24-48h
    const recentMatches = await base44.asServiceRole.entities.Match.filter({
      is_match: true,
      status: 'active',
      matched_at: { 
        $gte: fortyEightHoursAgo.toISOString(),
        $lte: twentyFourHoursAgo.toISOString()
      }
    });

    let nudgesSent = 0;

    for (const match of recentMatches) {
      // Check if any messages exist
      const messages = await base44.asServiceRole.entities.Message.filter({
        match_id: match.id
      });

      if (messages.length === 0) {
        // No messages sent - send nudge to BOTH users
        const [user1Profile, user2Profile] = await Promise.all([
          base44.asServiceRole.entities.UserProfile.filter({ id: match.user1_id }),
          base44.asServiceRole.entities.UserProfile.filter({ id: match.user2_id })
        ]);

        const profile1 = user1Profile[0];
        const profile2 = user2Profile[0];

        if (profile1 && profile2) {
          // Nudge user 1
          await base44.asServiceRole.entities.Notification.create({
            user_profile_id: match.user1_id,
            type: 'match',
            title: "👋 Say hello!",
            message: `You matched with ${profile2.display_name} - start a conversation!`,
            from_profile_id: match.user2_id,
            link_to: `/Chat?matchId=${match.id}`
          });

          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            user_profile_id: match.user1_id,
            title: "👋 Say hello!",
            body: `You matched with ${profile2.display_name} - start a conversation!`,
            link: `/Chat?matchId=${match.id}`,
            type: 'match'
          });

          // Nudge user 2
          await base44.asServiceRole.entities.Notification.create({
            user_profile_id: match.user2_id,
            type: 'match',
            title: "👋 Break the ice!",
            message: `${profile1.display_name} is waiting to hear from you!`,
            from_profile_id: match.user1_id,
            link_to: `/Chat?matchId=${match.id}`
          });

          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            user_profile_id: match.user2_id,
            title: "👋 Break the ice!",
            body: `${profile1.display_name} is waiting to hear from you!`,
            link: `/Chat?matchId=${match.id}`,
            type: 'match'
          });

          nudgesSent += 2;
        }
      } else {
        // Check for dead conversations (last message > 48h ago)
        const lastMessage = messages.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        )[0];

        const lastMessageTime = new Date(lastMessage.created_date);
        if (lastMessageTime < fortyEightHoursAgo) {
          // Nudge the person who DIDN'T send last message
          const otherUserId = lastMessage.sender_id === match.user1_id 
            ? match.user2_id 
            : match.user1_id;

          const senderProfile = await base44.asServiceRole.entities.UserProfile.filter({ 
            id: lastMessage.sender_id 
          });

          if (senderProfile[0]) {
            await base44.asServiceRole.entities.Notification.create({
              user_profile_id: otherUserId,
              type: 'message',
              title: "💬 They're waiting...",
              message: `${senderProfile[0].display_name} sent you a message!`,
              from_profile_id: lastMessage.sender_id,
              link_to: `/Chat?matchId=${match.id}`
            });

            await base44.asServiceRole.functions.invoke('sendPushNotification', {
              user_profile_id: otherUserId,
              title: "💬 They're waiting...",
              body: `${senderProfile[0].display_name} sent you a message!`,
              link: `/Chat?matchId=${match.id}`,
              type: 'message'
            });

            nudgesSent++;
          }
        }
      }
    }

    return Response.json({
      success: true,
      nudges_sent: nudgesSent,
      matches_checked: recentMatches.length
    });

  } catch (error) {
    console.error('Nudge sending error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});