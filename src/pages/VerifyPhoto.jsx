import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Camera, CheckCircle, Shield, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VerifyPhoto() {
  const [myProfile, setMyProfile] = useState(null);
  const [selfieUrl, setSelfieUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchProfile();
  }, []);

  const handleSelfieUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSelfieUrl(file_url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setIsUploading(false);
  };

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!selfieUrl || !myProfile) return;

      // Use AI to compare selfie with profile photos with detailed face analysis
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional face verification AI. Carefully analyze both images and determine if they show the same person.

CRITICAL ANALYSIS REQUIRED:
1. FACIAL STRUCTURE: Compare bone structure, face shape, jawline, forehead, cheekbones
2. FACIAL FEATURES: Eyes (shape, size, spacing), nose (shape, size), mouth, ears
3. SKIN TONE: Consistency in skin color and texture
4. AGE CONSISTENCY: Both photos should show similar age
5. UNIQUE MARKERS: Moles, scars, birthmarks, facial hair patterns
6. AUTHENTICITY: Check for signs of deepfakes, photo manipulation, or different people

VERIFICATION STANDARDS:
- Match ONLY if you're 80%+ confident it's the same person
- Consider lighting and angle differences
- Look for consistent unique facial characteristics
- Flag if images show different people or manipulated photos

Return:
- is_match: true ONLY if 80%+ confident same person
- confidence: Your confidence level 0-100
- reason: Detailed explanation of why you made this determination`,
        file_urls: [selfieUrl, myProfile.primary_photo],
        response_json_schema: {
          type: 'object',
          properties: {
            is_match: { type: 'boolean' },
            confidence: { type: 'number' },
            reason: { type: 'string' },
            facial_structure_match: { type: 'boolean' },
            features_match: { type: 'boolean' },
            authenticity_check: { type: 'boolean' }
          }
        }
      });

      // Update profile if verified (requires 80%+ confidence)
      const isVerified = result.is_match && result.confidence >= 80 && result.facial_structure_match && result.features_match;
      
      if (isVerified) {
        await base44.entities.UserProfile.update(myProfile.id, {
          verification_status: {
            ...myProfile.verification_status,
            photo_verified: true
          },
          verification_selfie_url: selfieUrl,
          ai_safety_score: result.confidence
        });
      }

      return { ...result, verified: isVerified };
    },
    onSuccess: (data) => {
      setVerificationResult(data);
    }
  });

  if (verificationResult?.verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-xl">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Photo Verified! ✓</h2>
          <p className="text-gray-500 mb-2">
            Thank you for verifying your identity.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Confidence: {verificationResult.confidence}%
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-purple-600 hover:bg-purple-700 w-full">
              Continue to Afrinnect
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Mandatory Verification</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Mandatory Verification</h3>
                <p className="text-sm text-gray-600 mb-2">
                  To ensure the safety of our community, we require all members to verify their photos after 30 minutes of joining.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Verify that your selfie matches your profile photos</li>
                  <li>• Get the verified badge on your profile</li>
                  <li>• Build trust with potential matches</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Photo */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Profile Photo</h3>
          <img
            src={myProfile?.primary_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'}
            alt="Profile"
            className="w-32 h-32 rounded-2xl object-cover border-2 border-gray-200"
          />
        </div>

        {/* Selfie Upload */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Take a Selfie</h3>
          
          {!selfieUrl ? (
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleSelfieUpload}
                className="hidden"
                disabled={isUploading}
              />
              <div className="aspect-[3/4] max-w-xs rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition">
                {isUploading ? (
                  <Loader2 size={48} className="text-purple-600 animate-spin mb-4" />
                ) : (
                  <>
                    <Camera size={48} className="text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">Take Selfie</p>
                    <p className="text-xs text-gray-400 mt-2 text-center px-4">
                      Make sure your face is clearly visible
                    </p>
                  </>
                )}
              </div>
            </label>
          ) : (
            <div className="relative inline-block">
              <img
                src={selfieUrl}
                alt="Selfie"
                className="w-48 h-64 rounded-2xl object-cover border-2 border-purple-200"
              />
              <button
                onClick={() => setSelfieUrl(null)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Tips for best results:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Face the camera directly</li>
              <li>• Use good lighting</li>
              <li>• Remove sunglasses and hats</li>
              <li>• Match the pose of your profile photo</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Verify Button */}
        <Button
          onClick={() => verifyMutation.mutate()}
          disabled={!selfieUrl || verifyMutation.isPending}
          className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        >
          {verifyMutation.isPending ? (
            <>
              <Loader2 size={24} className="animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            <>
              <Shield size={24} className="mr-2" />
              Verify My Photo
            </>
          )}
        </Button>

        {/* Failed Verification */}
        {verificationResult && !verificationResult.verified && (
          <Alert className="mt-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Verification Failed</strong>
              <p className="mt-1 text-sm">
                {verificationResult.reason || "We couldn't verify your photo. Please make sure your face is clearly visible and matches your profile photo."}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelfieUrl(null);
                    setVerificationResult(null);
                  }}
                  className="bg-white hover:bg-gray-50 text-red-600 border-red-200"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Retake Selfie
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}