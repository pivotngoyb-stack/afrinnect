import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Call this function hourly via cron or scheduled task
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called by a scheduled job/cron
    // For now, it can be triggered manually from admin dashboard
    
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Find events starting in 24 hours
    const upcomingEvents = await base44.asServiceRole.entities.Event.filter({
      start_date: {
        $gte: now.toISOString(),
        $lte: twentyFourHoursFromNow.toISOString()
      }
    });
    
    let remindersSent = 0;
    
    for (const event of upcomingEvents) {
      if (!event.attendees || event.attendees.length === 0) continue;
      
      // Get attendee profiles
      const attendeeProfiles = await base44.asServiceRole.entities.UserProfile.filter({
        id: { $in: event.attendees }
      });
      
      // Get user emails
      const userIds = attendeeProfiles.map(p => p.user_id);
      const users = await Promise.all(
        userIds.map(async (userId) => {
          try {
            // Note: We'd need a way to get user by ID from base44.users
            // For now, we'll send notifications through the app
            return null;
          } catch (e) {
            return null;
          }
        })
      );
      
      // Send in-app notifications to all attendees
      for (const attendee of attendeeProfiles) {
        await base44.asServiceRole.entities.Notification.create({
          user_profile_id: attendee.id,
          type: 'admin_message',
          title: `Reminder: ${event.title} starts soon! 🎉`,
          message: `Your event "${event.title}" starts tomorrow at ${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. ${event.is_virtual ? 'Virtual link will be available when you open the event.' : `Location: ${event.location_name || event.city}`}`,
          link_to: `EventDetails?id=${event.id}`,
          is_admin: true
        });
        
        remindersSent++;
      }
    }
    
    // Find events starting in 1 hour (final reminder)
    const imminentEvents = await base44.asServiceRole.entities.Event.filter({
      start_date: {
        $gte: now.toISOString(),
        $lte: oneHourFromNow.toISOString()
      }
    });
    
    for (const event of imminentEvents) {
      if (!event.attendees || event.attendees.length === 0) continue;
      
      const attendeeProfiles = await base44.asServiceRole.entities.UserProfile.filter({
        id: { $in: event.attendees }
      });
      
      for (const attendee of attendeeProfiles) {
        await base44.asServiceRole.entities.Notification.create({
          user_profile_id: attendee.id,
          type: 'admin_message',
          title: `Starting Soon: ${event.title} 🎊`,
          message: `Your event starts in 1 hour! ${event.is_virtual ? 'Join now from the event page.' : 'Get ready to head to the venue!'}`,
          link_to: `EventDetails?id=${event.id}`,
          is_admin: true
        });
        
        remindersSent++;
      }
    }
    
    return Response.json({
      success: true,
      remindersSent,
      eventsChecked: upcomingEvents.length + imminentEvents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Event reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});