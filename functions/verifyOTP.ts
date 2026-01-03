import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Rate limiter: max 5 verification attempts per phone per hour
const verifyRateLimit = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone_number, otp_code } = await req.json();
    
    if (!phone_number || !otp_code) {
      return Response.json({ error: 'Phone number and OTP are required' }, { status: 400 });
    }

    // Rate limiting
    const now = Date.now();
    const rateKey = phone_number;
    const attempts = verifyRateLimit.get(rateKey) || [];
    const recentAttempts = attempts.filter(time => now - time < 3600000); // 1 hour

    if (recentAttempts.length >= 5) {
      return Response.json({ 
        error: 'Too many verification attempts. Please wait 1 hour or request a new OTP.' 
      }, { status: 429 });
    }

    // Get latest OTP for this phone
    const verifications = await base44.entities.PhoneVerification.filter(
      { user_id: user.id, phone_number, verified: false },
      '-created_date',
      1
    );

    if (verifications.length === 0) {
      return Response.json({ error: 'No OTP found. Please request a new one.' }, { status: 404 });
    }

    const verification = verifications[0];

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return Response.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts (max 3 per OTP)
    if (verification.attempts >= 3) {
      return Response.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    // Verify OTP
    if (verification.otp_code !== otp_code) {
      // Increment attempts
      await base44.entities.PhoneVerification.update(verification.id, {
        attempts: verification.attempts + 1
      });

      // Update rate limiter
      verifyRateLimit.set(rateKey, [...recentAttempts, now]);

      return Response.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
    }

    // Success! Mark as verified
    await base44.entities.PhoneVerification.update(verification.id, {
      verified: true,
      verified_at: new Date().toISOString()
    });

    // Update user profile
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, {
        verification_status: {
          ...profiles[0].verification_status,
          phone_verified: true
        }
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Phone verified successfully' 
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});