import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';

export default function PhoneVerification() {
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if already verified
        const verifications = await base44.entities.PhoneVerification.filter({
          user_id: currentUser.id,
          is_verified: true
        });
        
        if (verifications.length > 0) {
          setVerified(true);
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    checkUser();
  }, []);

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      
      await base44.entities.PhoneVerification.create({
        user_id: user.id,
        phone_number: phoneNumber,
        verification_code: code,
        is_verified: false,
        expires_at: expiresAt,
        attempts: 0
      });

      // Send verification code via email
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Afrinnect Phone Verification Code',
        body: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nPhone: ${phoneNumber}\n\nIf you didn't request this, please ignore this email.`
      });
      
      return code;
    },
    onSuccess: () => {
      setCodeSent(true);
    }
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const verifications = await base44.entities.PhoneVerification.filter({
        user_id: user.id,
        phone_number: phoneNumber,
        verification_code: verificationCode
      });

      if (verifications.length === 0) {
        throw new Error('Invalid verification code');
      }

      const verification = verifications[0];
      
      // Check expiry
      if (new Date(verification.expires_at) < new Date()) {
        throw new Error('Verification code has expired');
      }

      // Mark as verified
      await base44.entities.PhoneVerification.update(verification.id, {
        is_verified: true
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
    },
    onSuccess: () => {
      setVerified(true);
      setTimeout(() => {
        window.location.href = createPageUrl('Home');
      }, 2000);
    },
    onError: (error) => {
      alert(error.message);
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
          <p className="text-gray-600 mt-2">We need to verify your phone number for account security</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone size={20} />
              Phone Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    We sent a 6-digit code to your email <strong>({user?.email})</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    For phone: {phoneNumber}
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