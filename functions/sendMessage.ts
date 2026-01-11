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

        // Check blocking
        const receiverProfile = await base44.entities.UserProfile.filter({ id: receiverId });
        if (receiverProfile.length > 0 && receiverProfile[0].blocked_users?.includes(myProfile.id)) {
             return Response.json({ error: 'You cannot message this user' }, { status: 403 });
        }

        // 3. Rate Limiting
        const recentMsgs = await base44.entities.Message.filter(
            { sender_id: myProfile.id }, 
            '-created_date', 
            1
        );
        if (recentMsgs.length > 0) {
            const lastTime = new Date(recentMsgs[0].created_date).getTime();
            if (Date.now() - lastTime < 1000) { 
                return Response.json({ error: 'You are sending too quickly' }, { status: 429 });
            }
        }

        // 4. Subscription Limit
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

        // 5. ROBUST AI SCAM & SAFETY ANALYSIS
        let isFlagged = false;
        let isDeleted = false;
        let scamAnalysisData = null;

        if ((type === 'text' && content) || (type === 'image' && mediaUrl)) {
            try {
                // Fetch recent context for this user to detect patterns (e.g. repeated messages)
                const lastFewMsgs = await base44.entities.Message.filter(
                    { sender_id: myProfile.id }, 
                    '-created_date', 
                    5
                );
                const msgHistory = lastFewMsgs.map(m => m.content).join(" | ");

                const analysis = await base44.integrations.Core.InvokeLLM({
                    prompt: `
                    Analyze this message for ZERO TOLERANCE violations, scams, and safety risks.
                    Sender Context: Account age ${(new Date() - new Date(myProfile.created_date)) / (1000 * 60 * 60 * 24)} days.
                    Message Content: "${content || '[Image Attached]'}"
                    Recent History: "${msgHistory}"

                    STRICTLY DETECT (Zero Tolerance):
                    1. Harassment, bullying, or threatening behavior
                    2. Hate speech, racism, or discrimination
                    3. Sexual harassment or unsolicited explicit content (including NSFW images)
                    4. Fake profiles or catfishing indicators
                    5. Scamming, money requests, or crypto scams
                    6. Sharing others' private information (Doxing)
                    7. Prostitution, trafficking, or solicitation
                    8. Off-platform redirection (WhatsApp, Telegram) used aggressively

                    Return JSON: {
                        "is_safe": boolean,
                        "risk_score": number (0-100),
                        "scam_type": "string" (harassment, hate_speech, sexual_content, scam, doxing, trafficking, none),
                        "reasons": ["string"]
                    }
                    `,
                    file_urls: mediaUrl ? [mediaUrl] : undefined,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            is_safe: { type: "boolean" },
                            risk_score: { type: "number" },
                            scam_type: { type: "string" },
                            reasons: { type: "array", items: { type: "string" } }
                        }
                    }
                });

                if (!analysis.is_safe || analysis.risk_score > 50) {
                    isFlagged = true;
                    // If high risk, soft delete immediately
                    if (analysis.risk_score > 80) {
                        isDeleted = true; // "Shadow ban" message
                    }

                    // Log detailed analysis
                    scamAnalysisData = {
                        risk_score: analysis.risk_score,
                        scam_type: analysis.scam_type,
                        ai_analysis: {
                            is_suspicious: !analysis.is_safe,
                            confidence: analysis.risk_score,
                            reasons: analysis.reasons
                        },
                        action_taken: isDeleted ? 'hidden' : 'flagged'
                    };
                }

            } catch (e) {
                console.error("Safety analysis failed", e);
            }
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

        // 7. Save Scam Analysis & Auto-Report to Admin
        if (scamAnalysisData) {
            await base44.entities.ScamAnalysis.create({
                message_id: message.id,
                sender_id: myProfile.id,
                ...scamAnalysisData
            });

            // Automatically file a formal Report if high risk (visible to Admin)
            if (scamAnalysisData.risk_score > 70) {
                 try {
                     await base44.entities.Report.create({
                        reporter_id: receiverId, // Filed on behalf of the victim
                        reported_id: myProfile.id,
                        report_type: 'scam',
                        description: `[AI AUTO-FLAG] High Risk Message (${scamAnalysisData.risk_score}%). Type: ${scamAnalysisData.scam_type}. Reasons: ${scamAnalysisData.ai_analysis.reasons.join(', ')}`,
                        status: 'pending',
                        action_taken: isDeleted ? 'content_removed' : 'none',
                        evidence_urls: []
                     });
                 } catch (e) {
                     console.error("Failed to auto-report", e);
                 }
            }
        }

        // 8. Notifications (only if not deleted)
        if (!isDeleted) {
            await base44.entities.Notification.create({
                user_profile_id: receiverId,
                type: 'message',
                title: `Message from ${myProfile.display_name}`,
                message: content.substring(0, 50),
                from_profile_id: myProfile.id,
                link_to: `Chat?matchId=${matchId}`
            });

            try {
                 await base44.functions.invoke('sendPushNotification', {
                     user_profile_id: receiverId,
                     title: `New message from ${myProfile.display_name}`,
                     body: content.substring(0, 50),
                     type: 'message'
                 });
            } catch(e) {}
        }

        return Response.json(message);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});