import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Rate limiter: max 3 OTP requests per phone per hour
const otpRateLimit = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone_number } = await req.json();
    
    if (!phone_number || !/^\+\d{10,15}$/.test(phone_number)) {
      return Response.json({ error: 'Invalid phone number. Use format: +1234567890' }, { status: 400 });
    }

    // Rate limiting
    const now = Date.now();
    const rateKey = phone_number;
    const attempts = otpRateLimit.get(rateKey) || [];
    const recentAttempts = attempts.filter(time => now - time < 3600000); // 1 hour

    if (recentAttempts.length >= 3) {
      return Response.json({ 
        error: 'Too many requests. Please wait 1 hour before trying again.' 
      }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now + 600000); // 10 minutes

    // Store OTP in PhoneVerification entity
    await base44.entities.PhoneVerification.create({
      user_id: user.id,
      phone_number,
      otp_code: otp,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0
    });

    // Update rate limiter
    otpRateLimit.set(rateKey, [...recentAttempts, now]);

    // TODO: Send SMS via Twilio or other SMS provider
    // For now, just log it (in production, integrate with SMS gateway)
    console.log(`OTP for ${phone_number}: ${otp}`);

    return Response.json({ 
      success: true, 
      message: 'OTP sent successfully',
      expires_in_seconds: 600,
      // TEMPORARY: Return OTP for testing (REMOVE IN PRODUCTION)
      otp_code: otp
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});