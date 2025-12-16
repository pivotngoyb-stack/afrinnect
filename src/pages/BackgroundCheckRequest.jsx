import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function BackgroundCheckRequest() {
  const [myProfile, setMyProfile] = useState(null);
  const [checkType, setCheckType] = useState('basic');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      } catch (e) {}
    };
    fetchProfile();
  }, []);

  const requestMutation = useMutation({
    mutationFn: async () => {
      const cost = checkType === 'basic' ? 29.99 : 49.99;
      await base44.entities.BackgroundCheck.create({
        user_profile_id: myProfile.id,
        check_type: checkType,
        status: 'pending',
        amount_paid: cost
      });
    },
    onSuccess: () => {
      alert('Background check requested! Results in 3-5 business days.');
      window.location.href = createPageUrl('Profile');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-24">
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Settings')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Background Check</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <Shield size={48} className="mx-auto text-blue-600 mb-4" />
            <h2 className="text-xl font-bold text-center mb-2">Verify Your Identity</h2>
            <p className="text-center text-gray-600 mb-6">
              Add an extra layer of trust to your profile
            </p>

            <RadioGroup value={checkType} onValueChange={setCheckType} className="space-y-4">
              <Card className={checkType === 'basic' ? 'border-blue-600' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="basic" id="basic" />
                    <Label htmlFor="basic" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Basic Check - $29.99</div>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        <li>• Identity verification</li>
                        <li>• Criminal record check</li>
                        <li>• Sex offender registry</li>
                      </ul>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card className={checkType === 'comprehensive' ? 'border-blue-600' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comprehensive" id="comprehensive" />
                    <Label htmlFor="comprehensive" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Comprehensive - $49.99</div>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        <li>• Everything in Basic</li>
                        <li>• Employment history</li>
                        <li>• Education verification</li>
                        <li>• Address history</li>
                      </ul>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>

            <Button 
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending || !myProfile}
              className="w-full mt-6 bg-blue-600"
            >
              {requestMutation.isPending ? 'Processing...' : 'Request Background Check'}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Results typically available in 3-5 business days. Your information is kept private and secure.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}