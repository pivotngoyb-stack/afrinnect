import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { campaign_title, subject, body, target_audience } = await req.json();

    if (!subject || !body) {
      return Response.json({ error: 'Subject and body required' }, { status: 400 });
    }

    // Get target users based on audience
    let profiles = [];
    switch (target_audience) {
      case 'all':
        profiles = await base44.asServiceRole.entities.UserProfile.filter({ is_active: true });
        break;
      case 'premium':
        profiles = await base44.asServiceRole.entities.UserProfile.filter({ is_premium: true });
        break;
      case 'free':
        profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
          $or: [{ is_premium: false }, { is_premium: null }]
        });
        break;
      case 'inactive':
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        profiles = await base44.asServiceRole.entities.UserProfile.filter({
          last_active: { $lt: sevenDaysAgo }
        });
        break;
      default:
        profiles = await base44.asServiceRole.entities.UserProfile.filter({ is_active: true });
    }

    // Get user emails
    const userIds = profiles.map(p => p.user_id);
    let emailsSent = 0;

    for (const profile of profiles) {
      try {
        // Get user email from User entity
        const users = await base44.asServiceRole.entities.User.filter({ id: profile.user_id });
        if (users.length === 0) continue;

        const userEmail = users[0].email;

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Afrinnect',
          to: userEmail,
          subject: subject,
          body: `
            Hi ${profile.display_name}!
            
            ${body}
            
            ---
            
            To unsubscribe from marketing emails, click the unsubscribe link below.
            
            © 2025 Afrinnect. All rights reserved.
          `
        });

        emailsSent++;
      } catch (e) {
        console.error('Failed to send email to profile', profile.id, e);
      }
    }

    return Response.json({
      success: true,
      campaign: campaign_title,
      targeted: profiles.length,
      sent: emailsSent
    });
  } catch (error) {
    console.error('Newsletter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});