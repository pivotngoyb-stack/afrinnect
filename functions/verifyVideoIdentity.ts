import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { centerUrl, leftUrl, rightUrl } = await req.json();

    if (!centerUrl || !leftUrl || !rightUrl) {
      return Response.json({ error: 'Missing verification images' }, { status: 400 });
    }

    // Get user profile for reference photo
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    // AI Analysis
    // We send: Reference (Profile Photo), Center, Left, Right
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strict identity verification AI. You are verifying a user via a "video-like" check where they captured 3 specific frames: Center, Left, and Right.

Your task is to compare these 3 frames against the user's Reference Profile Photo.

INPUTS:
1. Reference Photo: User's primary profile photo.
2. Center Frame: User looking straight at camera.
3. Left Frame: User looking to their left.
4. Right Frame: User looking to their right.

VERIFICATION CRITERIA (Strict but reasonable):
1. IDENTITY MATCH (Critical): Do all 3 frames match the Reference Photo? (Allow for lighting/makeup/beard changes, but bone structure must match).
2. LIVENESS CHECK (Critical): 
   - Is "Center" actually looking center?
   - Is "Left" actually looking left?
   - Is "Right" actually looking right?
   - Are these 3 DISTINCT images (not just duplicates)?
3. CONSISTENCY: Do the 3 frames look like they were taken in the same session (same clothes/lighting)?

STRICTNESS LEVEL:
- Identity: STRICT. If it looks like a different person, reject.
- Poses: MODERATE. As long as the head is turned in the correct general direction, approve. Don't demand exact 90 degrees.
- Quality: MODERATE. Allow for some blur/grain, but face must be visible.

RESPONSE FORMAT (JSON):
{
  "is_match": boolean, (true ONLY if identity matches AND poses are correct)
  "confidence": number, (0-100)
  "poses_valid": {
    "center": boolean,
    "left": boolean,
    "right": boolean
  },
  "identity_valid": boolean,
  "reason": "Short explanation for the user (e.g., 'Face mismatch', 'Please turn head further left', 'Success')"
}`,
      file_urls: [profile.primary_photo, centerUrl, leftUrl, rightUrl],
      response_json_schema: {
        type: "object",
        properties: {
          is_match: { type: "boolean" },
          confidence: { type: "number" },
          poses_valid: {
            type: "object",
            properties: {
              center: { type: "boolean" },
              left: { type: "boolean" },
              right: { type: "boolean" }
            }
          },
          identity_valid: { type: "boolean" },
          reason: { type: "string" }
        }
      }
    });

    if (result.is_match && result.confidence >= 75) {
      // Success - Update profile
      await base44.entities.UserProfile.update(profile.id, {
        verification_status: {
          ...profile.verification_status,
          photo_verified: true
        },
        verification_selfie_url: centerUrl, // Store the center frame as the verification proof
        ai_safety_score: Math.max(profile.ai_safety_score || 0, result.confidence)
      });
    }

    return Response.json(result);

  } catch (error) {
    console.error('Video verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});