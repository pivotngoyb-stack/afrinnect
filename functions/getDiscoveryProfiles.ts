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

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function formatEnum(value) {
    if (!value) return '';
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

        // 4.5 Get user's ML profile for personalized scoring
        const mlProfiles = await base44.asServiceRole.entities.UserMLProfile.filter({ user_id: myProfile.id });
        const mlProfile = mlProfiles[0] || {
            preference_weights: {
                cultural_background: 1.0, religion: 1.0, interests: 1.0, location: 1.0,
                education: 1.0, lifestyle: 1.0, relationship_goal: 1.0, age_proximity: 1.0
            },
            liked_patterns: { countries: [], religions: [], interests: [] }
        };
        const weights = mlProfile.preference_weights || {};
        const likedPatterns = mlProfile.liked_patterns || {};

        // 5. Score & Refine with ML-enhanced algorithm
        let results = candidates.map(p => {
             let score = 0;
             const reasons = [];
             const breakdown = {};

             // 1. Cultural Background (base: 25 points, ML-weighted)
             let culturalScore = 0;
             if (myProfile.country_of_origin === p.country_of_origin) {
                 culturalScore += 15;
                 reasons.push(`Both from ${p.country_of_origin}`);
             }
             if (myProfile.tribe_ethnicity && p.tribe_ethnicity && myProfile.tribe_ethnicity === p.tribe_ethnicity) {
                 culturalScore += 10;
                 reasons.push(`Shared heritage: ${p.tribe_ethnicity}`);
             }
             // ML boost: user historically likes this country
             if (likedPatterns.countries?.includes(p.country_of_origin)) {
                 culturalScore += 5;
             }
             breakdown.cultural = culturalScore;
             score += culturalScore * (weights.cultural_background || 1.0);

             // 2. Religion (base: 15 points, ML-weighted)
             let religionScore = 0;
             if (myProfile.religion === p.religion) {
                 religionScore = 15;
                 reasons.push(`Shared faith: ${formatEnum(p.religion)}`);
             }
             if (likedPatterns.religions?.includes(p.religion)) {
                 religionScore += 3;
             }
             breakdown.religion = religionScore;
             score += religionScore * (weights.religion || 1.0);

             // 3. Shared Interests (base: 20 points, ML-weighted)
             let interestScore = 0;
             const sharedInterests = myProfile.interests?.filter(i => p.interests?.includes(i)) || [];
             interestScore = Math.min(sharedInterests.length * 4, 20);
             if (sharedInterests.length > 0) {
                 reasons.push(`${sharedInterests.length} shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
             }
             // ML boost for preferred interests
             const boostedInterests = sharedInterests.filter(i => likedPatterns.interests?.includes(i));
             interestScore += boostedInterests.length * 2;
             breakdown.interests = interestScore;
             score += interestScore * (weights.interests || 1.0);

             // 4. Location (base: 10 points, ML-weighted)
             let locationScore = 0;
             if (myProfile.current_city === p.current_city) {
                 locationScore = 10;
                 reasons.push(`Both in ${p.current_city}`);
             } else if (myProfile.current_state === p.current_state) {
                 locationScore = 5;
             }
             breakdown.location = locationScore;
             score += locationScore * (weights.location || 1.0);

             // 5. Relationship Goal (base: 15 points, ML-weighted)
             let goalScore = 0;
             if (myProfile.relationship_goal === p.relationship_goal) {
                 goalScore = 15;
                 reasons.push(`Both seeking ${formatEnum(p.relationship_goal)}`);
             }
             breakdown.relationship_goal = goalScore;
             score += goalScore * (weights.relationship_goal || 1.0);

             // 6. Lifestyle Compatibility (base: 10 points, ML-weighted)
             let lifestyleScore = 0;
             if (myProfile.lifestyle && p.lifestyle) {
                 if (myProfile.lifestyle.smoking === p.lifestyle.smoking) lifestyleScore += 2;
                 if (myProfile.lifestyle.drinking === p.lifestyle.drinking) lifestyleScore += 2;
                 if (myProfile.lifestyle.fitness === p.lifestyle.fitness) lifestyleScore += 3;
                 if (myProfile.lifestyle.diet === p.lifestyle.diet) lifestyleScore += 3;
             }
             if (lifestyleScore >= 6) reasons.push('Compatible lifestyle');
             breakdown.lifestyle = lifestyleScore;
             score += lifestyleScore * (weights.lifestyle || 1.0);

             // 7. Languages (bonus)
             const sharedLanguages = myProfile.languages?.filter(l => p.languages?.includes(l)) || [];
             if (sharedLanguages.length > 1) {
                 score += sharedLanguages.length * 2;
                 reasons.push(`${sharedLanguages.length} shared languages`);
             }

             // 8. Age Proximity (ML-weighted)
             let ageScore = 0;
             if (myProfile.birth_date && p.birth_date) {
                 const myAge = calculateAge(myProfile.birth_date);
                 const theirAge = calculateAge(p.birth_date);
                 const ageDiff = Math.abs(myAge - theirAge);
                 if (ageDiff <= 3) ageScore = 5;
                 else if (ageDiff <= 5) ageScore = 3;
                 else if (ageDiff <= 10) ageScore = 1;
             }
             breakdown.age = ageScore;
             score += ageScore * (weights.age_proximity || 1.0);

             // TIER PRIORITY (Passive Ranking)
             if (p.subscription_tier === 'vip') score += 50;
             if (p.subscription_tier === 'elite') score += 30;

             // BOOST LOGIC: Boosted profiles get massive priority
             if (p.profile_boost_active && p.boost_expires_at) {
                 const expiry = new Date(p.boost_expires_at);
                 if (expiry > new Date()) {
                     score += 500;
                 }
             }

             // Calculate Distance
             let distance = null;
             if (myProfile.location?.lat && p.location?.lat) {
                 distance = calculateDistance(myProfile.location.lat, myProfile.location.lng, p.location.lat, p.location.lng);
             }

             // Normalize score to 0-100
             const normalizedScore = Math.min(Math.round(score), 100);

             return { 
                 ...p, 
                 matchScore: normalizedScore, 
                 matchReasons: reasons.slice(0, 4),
                 matchBreakdown: breakdown,
                 distance 
             };
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