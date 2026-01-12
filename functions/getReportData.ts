import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || (user.role !== 'admin' && user.email !== 'pivotngoyb@gmail.com')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 1. Gather Metrics
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const prevThirtyDays = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

        // Users
        const totalUsers = await base44.entities.UserProfile.count({});
        const activeUsers = await base44.entities.UserProfile.count({ is_active: true });
        const newUsersLast30 = await base44.entities.UserProfile.count({ created_date: { $gte: thirtyDaysAgo } });
        const newUsersPrev30 = await base44.entities.UserProfile.count({ 
            created_date: { $gte: prevThirtyDays, $lt: thirtyDaysAgo } 
        });

        // Revenue
        const subs = await base44.entities.Subscription.filter({ status: 'active' });
        const mrr = subs.reduce((acc, sub) => {
            // Estimate based on plan type if amount_paid is 0 (legacy/manual)
            let amount = sub.amount_paid || 0;
            if (amount === 0) {
                if (sub.plan_type?.includes('premium')) amount = 19.99;
                if (sub.plan_type?.includes('elite')) amount = 39.99;
                if (sub.plan_type?.includes('vip')) amount = 99.99;
            }
            return acc + amount;
        }, 0);

        // Engagement
        const matchesLast30 = await base44.entities.Match.count({ created_date: { $gte: thirtyDaysAgo }, is_match: true });
        const msgsLast30 = await base44.entities.Message.count({ created_date: { $gte: thirtyDaysAgo } });

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

        // 2. Generate AI Executive Summary
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

        return Response.json({
            stats,
            aiAnalysis: aiResponse
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});