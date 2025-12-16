import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { IdCard, Upload, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';

export default function IDVerification() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const profiles = await base44.entities.UserProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) {
          setProfile(profiles[0]);
          if (profiles[0].verification_status?.id_verified) {
            setVerificationStatus('verified');
          }
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    checkUser();
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setIdPhoto(file_url);
    } catch (error) {
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const submitVerificationMutation = useMutation({
    mutationFn: async () => {
      // Use AI to verify ID and extract age
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ID document image and extract:
1. Is this a valid government ID?
2. Date of birth
3. Age (current age based on date of birth)
4. Does the person appear to be 18 or older?

Return JSON with: is_valid, date_of_birth, age, is_adult, confidence_score`,
        file_urls: [idPhoto],
        response_json_schema: {
          type: "object",
          properties: {
            is_valid: { type: "boolean" },
            date_of_birth: { type: "string" },
            age: { type: "number" },
            is_adult: { type: "boolean" },
            confidence_score: { type: "number" }
          }
        }
      });

      if (!aiResult.is_valid || !aiResult.is_adult) {
        throw new Error('ID verification failed or user is underage');
      }

      // Create verification request
      await base44.entities.VerificationRequest.create({
        user_profile_id: profile.id,
        verification_type: 'id',
        submitted_id_url: idPhoto,
        status: 'pending',
        ai_confidence_score: aiResult.confidence_score * 100
      });

      // Update profile with birth date if not set
      if (!profile.birth_date && aiResult.date_of_birth) {
        await base44.entities.UserProfile.update(profile.id, {
          birth_date: aiResult.date_of_birth
        });
      }

      return aiResult;
    },
    onSuccess: () => {
      setVerificationStatus('submitted');
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  if (verificationStatus === 'verified') {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ID Verified!</h2>
          <p className="text-gray-600 mb-4">Your identity has been confirmed</p>
          <Button onClick={() => window.location.href = createPageUrl('Profile')}>
            Go to Profile
          </Button>
        </motion.div>
      </div>
    );
  }

  if (verificationStatus === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={48} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Submitted!</h2>
          <p className="text-gray-600 mb-4">We're reviewing your ID. This usually takes 24-48 hours.</p>
          <Button onClick={() => window.location.href = createPageUrl('Home')}>
            Go to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Verify Your Age</h1>
          <p className="text-gray-600 mt-2">Upload a government-issued ID to confirm you're 18+</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard size={20} />
              ID Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {idPhoto ? (
                <div className="space-y-4">
                  <img src={idPhoto} alt="ID" className="w-full rounded-lg" />
                  <Button
                    variant="outline"
                    onClick={() => setIdPhoto(null)}
                    className="w-full"
                  >
                    Choose Different Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload size={48} className="mx-auto text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Upload ID Document</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Driver's license, passport, or national ID
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="id-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="id-upload">
                    <Button
                      asChild
                      disabled={uploading}
                      className="w-full"
                    >
                      <span>
                        <Camera size={18} className="mr-2" />
                        {uploading ? 'Uploading...' : 'Choose Photo'}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Privacy:</strong> Your ID is encrypted and only used for age verification. 
                We don't share it with anyone.
              </p>
            </div>

            {idPhoto && (
              <Button
                onClick={() => submitVerificationMutation.mutate()}
                disabled={submitVerificationMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {submitVerificationMutation.isPending ? 'Verifying...' : 'Submit for Verification'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}