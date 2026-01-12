import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            console.error("Auth check failed:", e);
            return Response.json({ error: 'Authentication failed' }, { status: 401 });
        }
        
        // Admin check
        if (!user || (user.role !== 'admin' && user.email !== 'pivotngoyb@gmail.com')) {
            console.log("Unauthorized access attempt by:", user?.email);
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        console.log("Starting report generation for:", user.email);

        // 1. Gather Metrics
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const prevThirtyDays = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

        // Helper for safe counting
        const safeCount = async (entity, filter) => {
            try {
                return await base44.entities[entity].count(filter);
            } catch (e) {
                console.error(`Count failed for ${entity}:`, e);
                return 0;
            }
        };

        // Users
        const totalUsers = await safeCount('UserProfile', {});
        const activeUsers = await safeCount('UserProfile', { is_active: true });
        const newUsersLast30 = await safeCount('UserProfile', { created_date: { $gte: thirtyDaysAgo } });
        const newUsersPrev30 = await safeCount('UserProfile', { 
            created_date: { $gte: prevThirtyDays, $lt: thirtyDaysAgo } 
        });

        // Revenue
        let mrr = 0;
        try {
            const subs = await base44.entities.Subscription.filter({ status: 'active' });
            mrr = subs.reduce((acc, sub) => {
                let amount = sub.amount_paid || 0;
                if (amount === 0) {
                    if (sub.plan_type?.includes('premium')) amount = 19.99;
                    if (sub.plan_type?.includes('elite')) amount = 39.99;
                    if (sub.plan_type?.includes('vip')) amount = 99.99;
                }
                return acc + amount;
            }, 0);
        } catch (e) {
            console.error("Revenue calc failed:", e);
        }

        // Engagement
        const matchesLast30 = await safeCount('Match', { created_date: { $gte: thirtyDaysAgo }, is_match: true });
        const msgsLast30 = await safeCount('Message', { created_date: { $gte: thirtyDaysAgo } });

        // Growth Calculation
        const userGrowth = newUsersPrev30 > 0 ? ((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100 : 100;

        const stats = {
            totalUsers,
            activeUsers,
            newUsersLast30,
            userGrowth: Math.round(userGrowth),
            mrr: Math.round(mrr),
            matchesLast30,
            msgsLast30
        };

        console.log("Stats gathered:", JSON.stringify(stats));

        // 2. Generate AI Executive Summary
        let aiAnalysis = {
            summary: "AI Analysis currently unavailable. Please check the metrics above.",
            highlights: ["Metric analysis pending", "System operational"],
            recommendation: "Focus on user acquisition and retention based on current trends."
        };

        try {
            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `
                You are a startup CFO/CTO preparing a monthly investor report.
                Write a professional, data-driven Executive Summary (2 paragraphs max).
                
                Metrics:
                - Total Users: ${totalUsers}
                - Active Users: ${activeUsers}
                - New Users (Last 30d): ${newUsersLast30} (Growth: ${Math.round(userGrowth)}%)
                - Monthly Recurring Revenue (MRR): $${Math.round(mrr)}
                - Engagement: ${matchesLast30} matches & ${msgsLast30} messages this month.

                Tone: Optimistic but realistic. Highlight the growth momentum and engagement quality.
                Mention "Afrinnect" as the app name.
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
            
            if (aiResponse) {
                aiAnalysis = aiResponse;
            }
        } catch (aiError) {
            console.error("AI Generation failed:", aiError);
            // Fallback is already set
        }

        return Response.json({
            stats,
            aiAnalysis
        });

    } catch (error) {
        console.error("Critical report error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});