import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // authenticate user
        const user = await base44.auth.me();
        
        // Check if requester is admin
        if (!user || (user.role !== 'admin' && user.email !== 'pivotngoyb@gmail.com')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return Response.json({ error: 'UserId is required' }, { status: 400 });
        }

        // Use service role for elevated privileges
        const adminDb = base44.asServiceRole;

        // 1. Get User Profiles to clean up data
        const userProfiles = await adminDb.entities.UserProfile.filter({ user_id: userId });
        const userEmail = userProfiles[0]?.created_by || 'Unknown';
        const displayName = userProfiles[0]?.display_name || 'Unknown';
        
        // Check ban status (for logging)
        const wasBanned = userProfiles.some(p => p.is_banned || !p.is_active);

        // 2. Log to DeletedAccount
        await adminDb.entities.DeletedAccount.create({
            user_id: userId,
            user_email: userEmail,
            display_name: displayName,
            deletion_reason: wasBanned ? 'Deleted while banned (Admin Action)' : 'Admin deleted (Clean Slate)',
            deleted_at: new Date().toISOString()
        });

        // 3. Clean up related data for each profile
        for (const profile of userProfiles) {
             // Delete Likes
             const likes = await adminDb.entities.Like.filter({ liker_id: profile.id });
             for (const like of likes) await adminDb.entities.Like.delete(like.id);
             
             // Delete Passes
             const passes = await adminDb.entities.Pass.filter({ passer_id: profile.id });
             for (const pass of passes) await adminDb.entities.Pass.delete(pass.id);

             // Delete Matches (as user1 or user2)
             const matches1 = await adminDb.entities.Match.filter({ user1_id: profile.id });
             for (const m of matches1) await adminDb.entities.Match.delete(m.id);
             
             const matches2 = await adminDb.entities.Match.filter({ user2_id: profile.id });
             for (const m of matches2) await adminDb.entities.Match.delete(m.id);

             // Delete Profile
             await adminDb.entities.UserProfile.delete(profile.id);
        }

        // 4. Log Audit
        await adminDb.entities.AdminAuditLog.create({
            admin_user_id: user.id,
            admin_email: user.email,
            action_type: 'user_delete',
            target_user_id: userId,
            details: { profiles: userProfiles.map(p => p.id), was_banned: wasBanned, method: 'backend_function' }
        });

        // 5. CRITICAL: Delete the User Auth Record
        await adminDb.entities.User.delete(userId);

        return Response.json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
        console.error('Delete user error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});