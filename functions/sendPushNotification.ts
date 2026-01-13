import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// RATE LIMITING: Track push notification sends
const pushRateLimits = new Map(); // user_profile_id -> {count, resetTime}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SECURITY: Verify admin or system-level call
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const { user_profile_id, title, body, link, type } = await req.json();

    if (!user_profile_id || !title || !body) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // RATE LIMIT: Max 10 push notifications per user per hour
    const now = Date.now();
    const userLimit = pushRateLimits.get(user_profile_id) || { count: 0, resetTime: now + 3600000 };
    
    if (now > userLimit.resetTime) {
      // Reset counter
      userLimit.count = 0;
      userLimit.resetTime = now + 3600000;
    }
    
    if (userLimit.count >= 10) {
      console.log(`Rate limit exceeded for user ${user_profile_id}`);
      return Response.json({ 
        success: false, 
        error: 'Rate limit exceeded - max 10 notifications per hour' 
      }, { status: 429 });
    }
    
    userLimit.count++;
    pushRateLimits.set(user_profile_id, userLimit);

    // Get user's push subscription tokens
    const profile = await base44.asServiceRole.entities.UserProfile.filter({ id: user_profile_id });
    if (profile.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Send push notification via Firebase Cloud Messaging
    // This requires Firebase Admin SDK setup with service account
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    
    if (!FCM_SERVER_KEY) {
      // Fallback: Just create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_profile_id,
        type: type || 'admin_message',
        title,
        message: body,
        link_to: link || 'Matches',
        is_admin: false
      });
      
      return Response.json({ 
        success: true, 
        method: 'in-app-only',
        message: 'In-app notification created. Set FCM_SERVER_KEY for push notifications.' 
      });
    }

    // Send to FCM if tokens exist
    const pushToken = profile[0].push_token;
    if (pushToken) {
      const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${FCM_SERVER_KEY}`
        },
        body: JSON.stringify({
          to: pushToken,
          notification: {
            title,
            body,
            click_action: link || 'https://afrinnect-658a9066.base44.app',
            icon: '/icon-192.png'
          },
          data: { type, link }
        })
      });

      const fcmData = await fcmResponse.json();
      
      // Also create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_profile_id,
        type: type || 'admin_message',
        title,
        message: body,
        link_to: link || 'Matches',
        is_admin: false
      });

      return Response.json({ 
        success: true, 
        method: 'push-and-in-app',
        fcm_result: fcmData 
      });
    } else {
      // No push token, just in-app
      await base44.asServiceRole.entities.Notification.create({
        user_profile_id,
        type: type || 'admin_message',
        title,
        message: body,
        link_to: link || 'Matches',
        is_admin: false
      });

      return Response.json({ 
        success: true, 
        method: 'in-app-only',
        message: 'User has no push token registered' 
      });
    }
  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});