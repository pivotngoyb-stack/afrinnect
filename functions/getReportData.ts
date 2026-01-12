import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            return Response.json({ error: 'Authentication failed' }, { status: 401 });
        }
        
        // Admin check
        if (!user || (user.role !== 'admin' && user.email !== 'pivotngoyb@gmail.com')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const prevThirtyDays = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

        // Helper for robust fetching
        const getCount = async (entity, filter = {}) => {
            try {
                return await base44.entities[entity].count(filter);
            } catch (e) {
                console.error(`Error counting ${entity}:`, e);
                return 0;
            }
        };

        // 1. Fetch ALL Metrics in Parallel (Connect to Everything)
        const [
            totalUsers,
            activeUsers,
            newUsersLast30,
            newUsersPrev30,
            matchesLast30,
            msgsLast30,
            totalEvents,
            totalStories,
            pendingReports,
            activeSubscriptions,
            totalCommunities,
            totalVideoProfiles,
            pendingVerifications,
            openTickets
        ] = await Promise.all([
            getCount('UserProfile', {}),
            getCount('UserProfile', { is_active: true }),
            getCount('UserProfile', { created_date: { $gte: thirtyDaysAgo } }),
            getCount('UserProfile', { created_date: { $gte: prevThirtyDays, $lt: thirtyDaysAgo } }),
            getCount('Match', { created_date: { $gte: thirtyDaysAgo }, is_match: true }),
            getCount('Message', { created_date: { $gte: thirtyDaysAgo } }),
            getCount('Event', {}),
            getCount('SuccessStory', {}),
            getCount('Report', { status: 'pending' }),
            base44.entities.Subscription.filter({ status: 'active' }, '-created_date', 1000).catch(() => []),
            getCount('Community', {}),
            getCount('VideoProfile', {}),
            getCount('VerificationRequest', { status: 'pending' }),
            getCount('SupportTicket', { status: 'open' })
        ]);

        // Revenue Calculation
        let mrr = 0;
        if (Array.isArray(activeSubscriptions)) {
            mrr = activeSubscriptions.reduce((acc, sub) => {
                let amount = sub.amount_paid || 0;
                // Estimate if manual/legacy
                if (amount === 0) {
                    if (sub.plan_type?.includes('premium')) amount = 19.99;
                    if (sub.plan_type?.includes('elite')) amount = 39.99;
                    if (sub.plan_type?.includes('vip')) amount = 99.99;
                }
                return acc + amount;
            }, 0);
        }

        // Growth Calculation
        const userGrowth = newUsersPrev30 > 0 ? ((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100 : 100;

        const stats = {
            totalUsers,
            activeUsers,
            newUsersLast30,
            userGrowth: Math.round(userGrowth),
            mrr: Math.round(mrr),
            matchesLast30,
            msgsLast30,
            totalEvents,
            totalStories,
            pendingReports,
            totalCommunities,
            totalVideoProfiles,
            pendingVerifications,
            openTickets
        };

        // 2. Generate AI Executive Summary with Fallback
        let aiAnalysis = {
            summary: "Executive Summary generation pending. The platform is showing steady activity with " + totalUsers + " users and " + matchesLast30 + " recent matches.",
            highlights: [
                `User base reached ${totalUsers}`,
                `Monthly Revenue at $${Math.round(mrr)}`,
                `${matchesLast30} matches created in the last 30 days`
            ],
            recommendation: "Focus on converting active users to paid subscriptions."
        };

        try {
            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `
                Act as a Startup CFO. Write a brief Investor Report Summary for "Afrinnect".
                
                Data:
                - Users: ${totalUsers} (${activeUsers} active)
                - Growth: +${newUsersLast30} users last 30d (${Math.round(userGrowth)}% growth)
                - Revenue: $${Math.round(mrr)} MRR
                - Engagement: ${matchesLast30} matches, ${msgsLast30} messages
                - Ecosystem: ${totalEvents} events, ${totalStories} success stories, ${totalCommunities} communities
                - Content Depth: ${totalVideoProfiles} video profiles
                - Safety & Ops: ${pendingVerifications} pending verifications, ${openTickets} open support tickets, ${pendingReports} pending reports
                
                Return JSON: { summary, highlights (array), recommendation }
                `,
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        highlights: { type: "array", items: { type: "string" } },
                        recommendation: { type: "string" }
                    }
                }
            });
            
            // Validate AI Response Structure
            if (aiResponse && typeof aiResponse === 'object') {
                // Ensure required fields exist, otherwise keep fallback
                if (aiResponse.summary && Array.isArray(aiResponse.highlights) && aiResponse.recommendation) {
                    aiAnalysis = aiResponse;
                }
            }
        } catch (e) {
            console.error("AI Generation failed, using fallback", e);
        }

        return Response.json({
            stats,
            aiAnalysis
        });

    } catch (error) {
        console.error("Report generation critical error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});