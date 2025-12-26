import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRateLimit, RateLimitWarning } from '@/components/shared/RateLimitGuard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';
import { auth } from '@/components/firebase/firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function PhoneVerification() {
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const { checkLimit, isBlocked, remainingTime } = useRateLimit('phone_verification', 3, 300000); // 3 attempts per 5 min

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if already verified
        const profiles = await base44.entities.UserProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0 && profiles[0].verification_status?.phone_verified) {
          setVerified(true);
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    checkUser();

    // Setup reCAPTCHA
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
    }

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      if (!checkLimit()) {
        throw new Error('Too many attempts. Please wait before trying again.');
      }

      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      
      return result;
    },
    onSuccess: () => {
      setCodeSent(true);
    },
    onError: (error) => {
      console.error('SMS Error:', error);
      alert(`Failed to send SMS: ${error.message}. Make sure phone number includes country code (e.g., +1 for US).`);
    }
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      if (!confirmationResult) {
        throw new Error('Please request a verification code first');
      }

      // Verify the code with Firebase
      await confirmationResult.confirm(verificationCode);

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

      // Create verification record
      await base44.entities.PhoneVerification.create({
        user_id: user.id,
        phone_number: phoneNumber,
        is_verified: true,
        verification_code: verificationCode
      });
    },
    onSuccess: () => {
      setVerified(true);
      setTimeout(() => {
        window.location.href = createPageUrl('Home');
      }, 2000);
    },
    onError: (error) => {
      console.error('Verification error:', error);
      alert(`Verification failed: ${error.message}`);
    }
  });

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Phone Verified!</h2>
          <p className="text-gray-600">Redirecting you to the app...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Verify Your Phone</h1>
          <p className="text-gray-600 mt-2">Enter your phone number with country code (e.g., +1 for US)</p>
          <p className="text-xs text-purple-600 mt-1">📱 SMS verification code will be sent</p>
        </div>

        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone size={20} />
              Phone Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RateLimitWarning isBlocked={isBlocked} remainingTime={remainingTime} />
            {!codeSent ? (
              <>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must include country code (e.g., +1 for US, +234 for Nigeria)
                  </p>
                </div>
                <Button
                  onClick={() => sendCodeMutation.mutate()}
                  disabled={!phoneNumber || sendCodeMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {sendCodeMutation.isPending ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center py-4 bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    ✅ SMS code sent to <strong>{phoneNumber}</strong>
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Check your text messages
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Verification Code</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="mt-2 text-center text-2xl tracking-widest"
                  />
                </div>
                <Button
                  onClick={() => verifyCodeMutation.mutate()}
                  disabled={verificationCode.length !== 6 || verifyCodeMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {verifyCodeMutation.isPending ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                  }}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}