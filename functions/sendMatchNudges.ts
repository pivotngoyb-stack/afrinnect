import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Find matches created > 3 days ago with no messages
        // This is a simplified logic for "nudge"
        // In real app, we'd check last_message_date
        
        // For now, let's just log it to avoid spamming
        console.log("Match nudges logic would run here");

        return Response.json({ nudged: 0 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});