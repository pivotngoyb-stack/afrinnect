import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, EyeOff, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function IncognitoMode() {
  const [myProfile, setMyProfile] = useState(null);
  const [isIncognito, setIsIncognito] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
          setIsIncognito(profiles[0].incognito_mode || false);
        }
      } catch (e) {}
    };
    fetchProfile();
  }, []);

  const toggleMutation = useMutation({
    mutationFn: async (enabled) => {
      await base44.entities.UserProfile.update(myProfile.id, {
        incognito_mode: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
    }
  });

  if (!myProfile?.is_premium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Crown size={64} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
            <p className="text-gray-600 mb-6">
              Incognito mode is available for Premium members only
            </p>
            <Link to={createPageUrl('Premium')}>
              <Button className="bg-amber-600">Upgrade Now</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 pb-24">
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Settings')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Incognito Mode</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <EyeOff size={24} className="text-purple-600" />
                <div>
                  <Label htmlFor="incognito" className="font-semibold">
                    Incognito Mode
                  </Label>
                  <p className="text-sm text-gray-500">
                    {isIncognito ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <Switch
                id="incognito"
                checked={isIncognito}
                onCheckedChange={(checked) => {
                  setIsIncognito(checked);
                  toggleMutation.mutate(checked);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">What is Incognito Mode?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Browse profiles without being seen</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Only people you like can see your profile</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Your profile won't appear in discovery</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Toggle on/off anytime</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}