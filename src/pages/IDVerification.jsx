import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Shield, CheckCircle, Loader2, AlertCircle, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import Logo from '@/components/shared/Logo';
import AfricanPattern from '@/components/shared/AfricanPattern';

export default function IDVerification() {
  const [myProfile, setMyProfile] = useState(null);
  const [step, setStep] = useState(1); // 1: document, 2: selfie, 3: processing
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          window.location.href = createPageUrl('Landing');
          return;
        }

        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length === 0) {
          window.location.href = createPageUrl('Onboarding');
          return;
        }

        const profile = profiles[0];
        setMyProfile(profile);

        // If already verified, redirect to home
        if (profile.verification_status?.id_verified) {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfile();
  }, []);

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setDocumentFile(file);
    setError('');
  };

  const handleSelfieUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setSelfieFile(file);
    setError('');
  };

  const handleSubmit = async () => {
    if (!documentType || !documentFile || !selfieFile) {
      setError('Please complete all steps');
      return;
    }

    setIsSubmitting(true);
    setStep(3);

    try {
      // Upload document
      const documentUpload = await base44.integrations.Core.UploadFile({ file: documentFile });
      const documentUrl = documentUpload.file_url;

      // Upload selfie
      const selfieUpload = await base44.integrations.Core.UploadFile({ file: selfieFile });
      const selfieUrl = selfieUpload.file_url;

      // Create verification request
      await base44.entities.VerificationRequest.create({
        user_profile_id: myProfile.id,
        verification_type: 'id',
        submitted_id_url: documentUrl,
        submitted_photo_url: selfieUrl,
        status: 'pending'
      });

      // AI auto-verification using LLM
      try {
        const aiVerification = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze these verification images for identity verification:
          
Document Type: ${documentType}
Document Image: Check if this is a valid government-issued ID (passport, driver's license, or ID card)
Selfie Image: Compare the person in the selfie with the photo on the document

Requirements:
1. Is the document clear and readable?
2. Does the document appear genuine (not fake/photoshopped)?
3. Does the person in the selfie match the person on the ID?
4. Is the document a valid type (passport, driver's license, or government ID)?
5. Can you see the person's face clearly in both images?

Respond ONLY in JSON format:
{
  "verified": true/false,
  "confidence": 0-100,
  "document_valid": true/false,
  "face_match": true/false,
  "reasoning": "brief explanation"
}`,
          file_urls: [documentUrl, selfieUrl],
          response_json_schema: {
            type: "object",
            properties: {
              verified: { type: "boolean" },
              confidence: { type: "number" },
              document_valid: { type: "boolean" },
              face_match: { type: "boolean" },
              reasoning: { type: "string" }
            }
          }
        });

        // Auto-approve if AI is confident
        if (aiVerification.verified && aiVerification.confidence >= 75) {
          // Update profile to verified
          await base44.entities.UserProfile.update(myProfile.id, {
            verification_status: {
              ...myProfile.verification_status,
              id_verified: true
            },
            is_active: true
          });

          // Update verification request
          const verificationRequests = await base44.entities.VerificationRequest.filter({
            user_profile_id: myProfile.id,
            status: 'pending'
          });
          
          if (verificationRequests.length > 0) {
            await base44.entities.VerificationRequest.update(verificationRequests[0].id, {
              status: 'approved',
              ai_confidence_score: aiVerification.confidence
            });
          }

          // Success - redirect to home
          alert('✅ Verification successful! Welcome to Afrinnect.');
          window.location.href = createPageUrl('Home');
        } else {
          // Send to manual review
          alert('Your verification is under review. Our team will check it within 24 hours and notify you via email.');
          
          // Update profile note
          await base44.entities.UserProfile.update(myProfile.id, {
            is_active: false // Keep inactive until manually verified
          });
          
          // Logout and redirect
          await base44.auth.logout();
          window.location.href = createPageUrl('Landing');
        }
      } catch (aiError) {
        console.error('AI verification failed:', aiError);
        // Fallback to manual review
        alert('Your verification is under review. Our team will check it within 24 hours and notify you via email.');
        await base44.auth.logout();
        window.location.href = createPageUrl('Landing');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setError('Verification failed. Please try again.');
      setStep(2);
      setIsSubmitting(false);
    }
  };

  if (!myProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative">
      <AfricanPattern className="text-purple-600" opacity={0.05} />

      <div className="max-w-2xl w-full relative z-10">
        <div className="text-center mb-8">
          <Logo size="large" />
        </div>

        <Card className="shadow-2xl border-purple-300">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Shield size={32} />
              Identity Verification Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Safety Message */}
            <Alert className="mb-6 bg-blue-50 border-blue-300">
              <Shield className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>For your safety and the safety of others,</strong> please verify your identity. 
                Our AI analyzes your documents in seconds to ensure a secure community.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="mb-6 bg-red-50 border-red-300">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Document Upload */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload ID Document</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose your document type and upload a clear photo
                  </p>

                  {/* Document Type Selection */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {['Passport', 'Driver License', 'Government ID'].map(type => (
                      <button
                        key={type}
                        onClick={() => setDocumentType(type)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          documentType === type
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900">{type}</p>
                      </button>
                    ))}
                  </div>

                  {documentType && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDocumentUpload}
                        className="hidden"
                        id="document-upload"
                      />
                      <label htmlFor="document-upload" className="cursor-pointer">
                        {documentFile ? (
                          <div>
                            <CheckCircle size={48} className="mx-auto text-green-600 mb-2" />
                            <p className="text-sm text-gray-900 font-medium">{documentFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Click to change</p>
                          </div>
                        ) : (
                          <div>
                            <Upload size={48} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Click to upload your {documentType}</p>
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG (max 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!documentType || !documentFile}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  Next: Take Selfie
                </Button>
              </motion.div>
            )}

            {/* Step 2: Selfie Upload */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Take a Selfie</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Take a clear selfie so we can match it with your ID
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-900">
                      <strong>Tips for a good selfie:</strong>
                    </p>
                    <ul className="text-xs text-yellow-800 mt-2 space-y-1">
                      <li>• Face the camera directly</li>
                      <li>• Good lighting (avoid shadows)</li>
                      <li>• Remove glasses if possible</li>
                      <li>• Neutral expression</li>
                    </ul>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleSelfieUpload}
                      className="hidden"
                      id="selfie-upload"
                    />
                    <label htmlFor="selfie-upload" className="cursor-pointer">
                      {selfieFile ? (
                        <div>
                          <CheckCircle size={48} className="mx-auto text-green-600 mb-2" />
                          <p className="text-sm text-gray-900 font-medium">Selfie captured!</p>
                          <p className="text-xs text-gray-500 mt-1">Click to retake</p>
                        </div>
                      ) : (
                        <div>
                          <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to take selfie</p>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG (max 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!selfieFile || isSubmitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Loader2 size={64} className="animate-spin mx-auto text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Analyzing Your Documents...
                </h3>
                <p className="text-gray-600">
                  Our AI is verifying your identity. This usually takes just a few seconds.
                </p>
              </motion.div>
            )}

            {/* Cannot Skip */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>⚠️ You must complete verification to access Afrinnect</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}