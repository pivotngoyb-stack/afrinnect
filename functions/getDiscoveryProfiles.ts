import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to calculate distance (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

Deno.serve(async (req) => {
    // In-memory rate limiting for discovery (expensive operation)
    // NOTE: In a distributed system, this should use Redis. 
    // Here we rely on Deno isolate persistence which works per-instance.
    const rateLimitMap = new Map();
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate Limit Check: 20 requests per minute
        const now = Date.now();
        const userRequests = rateLimitMap.get(user.id) || [];
        const recentRequests = userRequests.filter(time => now - time < 60000);
        
        if (recentRequests.length >= 20) {
             return Response.json({ error: 'Rate limit exceeded. Please slow down.' }, { status: 429 });
        }
        rateLimitMap.set(user.id, [...recentRequests, now]);

        const { filters = {}, mode = 'global', limit = 20, myProfileId } = await req.json();

        // 1. Get My Profile
        let myProfile;
        if (myProfileId) {
             const p = await base44.entities.UserProfile.filter({ id: myProfileId });
             myProfile = p[0];
        }
        if (!myProfile) {
             const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
             myProfile = profiles[0];
        }
        if (!myProfile) return Response.json({ profiles: [] });

        // 2. Get Excludes (Passes & Likes) - Optimization: Fetch only ID fields if possible, but SDK returns objects
        // We fetch these to build the exclusion list
        const [passes, likes] = await Promise.all([
             base44.entities.Pass.filter({ passer_id: myProfile.id }, '-created_date', 1000),
             base44.entities.Like.filter({ liker_id: myProfile.id }, '-created_date', 1000)
        ]);
        
        const excludeIds = new Set([
            myProfile.id, 
            ...passes.map(p => p.passed_id), 
            ...likes.map(l => l.liked_id),
            ...(myProfile.blocked_users || []) // Exclude users I have blocked
        ]);

        // 3. Build Database Query
        // We push as much filtering as possible to the DB query for performance
        let query = { 
            is_active: true,
            is_deleted: { $ne: true }, 
            id: { $nin: Array.from(excludeIds) },
            // Safety: Don't show users who blocked me
            blocked_users: { $ne: myProfile.id },
            // Restrict to USA/Canada
            current_country: { $in: ['USA', 'United States', 'Canada', 'United States of America', 'US'] }
        };

        // Gender Preference
        if (myProfile.looking_for && myProfile.looking_for.length > 0) {
            query.gender = { $in: myProfile.looking_for };
        }

        // Age Filter (Calculate date ranges)
        const today = new Date();
        if (filters.age_min) {
            const maxBirthDate = new Date(today.getFullYear() - filters.age_min, today.getMonth(), today.getDate()).toISOString().split('T')[0];
            query.birth_date = { ...query.birth_date, $lte: maxBirthDate };
        }
        if (filters.age_max) {
            const minBirthDate = new Date(today.getFullYear() - filters.age_max - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
            query.birth_date = { ...query.birth_date, $gte: minBirthDate };
        }

        // Simple Exact Match Filters
        if (filters.religion) query.religion = filters.religion;
        if (filters.education) query.education = filters.education;
        if (filters.preferred_language) query.preferred_language = filters.preferred_language;
        
        // Array Filters (using $in for any match)
        if (filters.relationship_goals?.length > 0) query.relationship_goal = { $in: filters.relationship_goals };
        if (filters.countries_of_origin?.length > 0) query.country_of_origin = { $in: filters.countries_of_origin };
        if (filters.states?.length > 0) query.current_state = { $in: filters.states };

        // 4. Fetch Candidates
        // Fetch 50 candidates to allow for further in-memory filtering (distance, complex arrays)
        const candidates = await base44.entities.UserProfile.filter(query, '-last_active', 50);

        // 5. Score & Refine
        let results = candidates.map(p => {
             // Calculate Match Score
             let score = 0;
             // Cultural (25pts)
             if (myProfile.country_of_origin === p.country_of_origin) score += 10;
             if (myProfile.tribe_ethnicity && p.tribe_ethnicity && myProfile.tribe_ethnicity === p.tribe_ethnicity) score += 8;
             if (myProfile.languages?.some(l => p.languages?.includes(l))) score += 7;
             
             // Values (20pts)
             const sharedValues = myProfile.cultural_values?.filter(v => p.cultural_values?.includes(v))?.length || 0;
             score += Math.min(sharedValues * 4, 20);
             
             // Goals/Religion (20pts)
             if (myProfile.religion === p.religion) score += 10;
             if (myProfile.relationship_goal === p.relationship_goal) score += 10;
             
             // Interests (15pts)
             const sharedInterests = myProfile.interests?.filter(i => p.interests?.includes(i))?.length || 0;
             score += Math.min(sharedInterests * 3, 15);
             
             // Location (10pts)
             if (myProfile.current_city === p.current_city) score += 5;

             // TIER PRIORITY (Passive Ranking)
             if (p.subscription_tier === 'vip') score += 50;
             if (p.subscription_tier === 'elite') score += 30;

             // BOOST LOGIC: Boosted profiles get massive priority
             if (p.profile_boost_active && p.boost_expires_at) {
                 const expiry = new Date(p.boost_expires_at);
                 if (expiry > new Date()) {
                     score += 500; // Pushes them to the top of any list
                 }
             }

             // Calculate Distance
             let distance = null;
             if (myProfile.location?.lat && p.location?.lat) {
                 distance = calculateDistance(myProfile.location.lat, myProfile.location.lng, p.location.lat, p.location.lng);
             }

             return { ...p, matchScore: Math.min(score, 100), distance };
        });

        // 6. Complex Filtering (In-Memory)
        results = results.filter(p => {
            // Distance Filter
            if (mode === 'local' && filters.distance_km && p.distance !== null) {
                if (p.distance > filters.distance_km) return false;
            }
            // Verification Filter
            if (filters.verified_only && !p.verification_status?.photo_verified) return false;
            
            // Incognito Check
            if (p.incognito_mode) return false;

            return true;
        });

        // 7. Sort
        if (mode === 'local') {
             results.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));
        } else {
             results.sort((a, b) => b.matchScore - a.matchScore);
        }

        return Response.json({ profiles: results.slice(0, limit) });

    } catch (error) {
        console.error('Discovery error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});