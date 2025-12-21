import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Optimized polling endpoint for real-time chat
// Returns only new messages since last poll
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId, lastMessageId, lastTimestamp } = await req.json();

    // Get only new messages since last poll
    const messages = await base44.entities.Message.filter(
      {
        match_id: matchId,
        created_date: { $gt: lastTimestamp || new Date(0).toISOString() }
      },
      'created_date',
      50
    );

    // Get typing status (could be stored in a separate entity)
    const typingStatus = {
      isTyping: false,
      userId: null
    };

    // Mark new messages as read
    const unreadMessages = messages.filter(m => m.receiver_id === user.id && !m.is_read);
    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(m => 
          base44.asServiceRole.entities.Message.update(m.id, {
            is_read: true,
            read_at: new Date().toISOString()
          })
        )
      );
    }

    return Response.json({
      messages,
      typingStatus,
      hasMore: messages.length === 50
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});