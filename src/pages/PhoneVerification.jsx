import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';
import { validatePhone } from '@/components/auth/RateLimitGuard';

export default function PhoneVerification() {
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');

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
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTPMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sendOTP', { phone_number: phoneNumber });
      if (response.data.otp_code) {
        // TEMPORARY: Show OTP in alert for testing
        alert(`Your verification code is: ${response.data.otp_code}\n(In production, this will be sent via SMS)`);
        setVerificationCode(response.data.otp_code);
      }
      return response.data;
    },
    onSuccess: () => {
      setOtpSent(true);
      setCountdown(60);
      setError('');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to send OTP';
      setError(errorMsg);
      alert(errorMsg);
    }
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('verifyOTP', { 
        phone_number: phoneNumber, 
        otp_code: otp 
      });
      return response.data;
    },
    onSuccess: () => {
      setVerified(true);
      setTimeout(() => {
        window.location.href = createPageUrl('Profile');
      }, 2000);
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || error.message || 'Verification failed';
      setError(errorMsg);
    }
  });

  const handleSendOTP = () => {
    // Validate phone format
    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid phone number in format: +1234567890');
      return;
    }
    setError('');
    sendOTPMutation.mutate();
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setError('');
    verifyOTPMutation.mutate();
  };

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
          <p className="text-gray-600">Redirecting you...</p>
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
          <p className="text-gray-600 mt-2">Enter your phone number with country code</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone size={20} />
              Phone Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!otpSent ? (
              <>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +[country code][number] (e.g., +12025551234)
                  </p>
                </div>
                <Button
                  onClick={handleSendOTP}
                  disabled={!phoneNumber || sendOTPMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {sendOTPMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Sending...
                    </>
                  ) : (
                    'Send Code'
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-800">
                    ✅ Code sent to <strong>{phoneNumber}</strong>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Verification Code</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="mt-2 text-center text-2xl tracking-widest"
                  />
                </div>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || verifyOTPMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {verifyOTPMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setError('');
                    }}
                    className="text-purple-600"
                  >
                    Change Number
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSendOTP}
                    disabled={countdown > 0 || sendOTPMutation.isPending}
                    className="text-purple-600"
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : 'Resend Code'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}