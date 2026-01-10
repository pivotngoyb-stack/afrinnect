import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { matchId, content, type = 'text', mediaUrl } = await req.json();

        if (!content && !mediaUrl) {
            return Response.json({ error: 'Message content required' }, { status: 400 });
        }

        // 1. Fetch My Profile
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
        const myProfile = profiles[0];

        // 2. Validate Match & Ownership
        const matches = await base44.entities.Match.filter({ id: matchId });
        if (!matches.length) return Response.json({ error: 'Match not found' }, { status: 404 });
        
        const match = matches[0];
        if (match.user1_id !== myProfile.id && match.user2_id !== myProfile.id) {
            return Response.json({ error: 'Not authorized' }, { status: 403 });
        }

        if (match.status !== 'active') {
            return Response.json({ error: 'Match is not active' }, { status: 403 });
        }
        
        const receiverId = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;

        // Check if I am blocked by the receiver (Double check beyond match status)
        const receiverProfile = await base44.entities.UserProfile.filter({ id: receiverId });
        if (receiverProfile.length > 0 && receiverProfile[0].blocked_users?.includes(myProfile.id)) {
             return Response.json({ error: 'You cannot message this user' }, { status: 403 });
        }

        // 3. Rate Limiting (Simple check)
        const recentMsgs = await base44.entities.Message.filter(
            { sender_id: myProfile.id }, 
            '-created_date', 
            1
        );
        if (recentMsgs.length > 0) {
            const lastTime = new Date(recentMsgs[0].created_date).getTime();
            if (Date.now() - lastTime < 1000) { // 1 second limit
                return Response.json({ error: 'You are sending too quickly' }, { status: 429 });
            }
        }

        // 4. Subscription Limit Check (Free tier limit - 20 messages per day)
        if (myProfile.subscription_tier === 'free') {
            const today = new Date().toISOString().split('T')[0];
            const dailyMsgs = await base44.entities.Message.filter({ 
                sender_id: myProfile.id,
                created_date: { $gte: `${today}T00:00:00.000Z` }
            });
            
            if (dailyMsgs.length >= 20) {
                 return Response.json({ error: 'upgrade_required' }, { status: 403 });
            }
        }

        // 5. AI Moderation
        let isFlagged = false;
        let isDeleted = false;

        try {
             // Only moderate text
             if (type === 'text' && content) {
                 const aiCheck = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analyze message for safety (harassment, scam, hate). Message: "${content}". Return JSON: { is_safe: boolean, reason: string }`,
                    response_json_schema: { type: "object", properties: { is_safe: { type: "boolean" }, reason: { type: "string" } } }
                 });
                 if (!aiCheck.is_safe) {
                     isFlagged = true;
                     // If very bad, delete? For now just flag.
                 }
             }
        } catch (e) {
            console.error("Moderation failed", e);
        }

        // 6. Create Message
        const message = await base44.entities.Message.create({
            match_id: matchId,
            sender_id: myProfile.id,
            receiver_id: receiverId,
            content: content,
            message_type: type,
            media_url: mediaUrl,
            is_read: false,
            is_flagged: isFlagged,
            is_deleted: isDeleted
        });

        // 7. Notifications
        await base44.entities.Notification.create({
            user_profile_id: receiverId,
            type: 'message',
            title: `Message from ${myProfile.display_name}`,
            message: content.substring(0, 50),
            from_profile_id: myProfile.id,
            link_to: `Chat?matchId=${matchId}`
        });

        // Push Notification (Fire and forget)
        try {
             await base44.functions.invoke('sendPushNotification', {
                 user_profile_id: receiverId,
                 title: `New message from ${myProfile.display_name}`,
                 body: content.substring(0, 50),
                 type: 'message'
             });
        } catch(e) {}

        return Response.json(message);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});