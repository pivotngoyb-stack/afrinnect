import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Users, Gift, Copy, Share2, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import AfricanPattern from '@/components/shared/AfricanPattern';

export default function ReferralDashboard() {
  const [myProfile, setMyProfile] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfile();
  }, []);

  // Fetch referrals
  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', myProfile?.id],
    queryFn: async () => {
      return await base44.entities.Referral.filter(
        { referrer_profile_id: myProfile.id },
        '-created_date'
      );
    },
    enabled: !!myProfile
  });

  // Fetch referred profiles
  const { data: referredProfiles = [] } = useQuery({
    queryKey: ['referred-profiles', referrals],
    queryFn: async () => {
      if (referrals.length === 0) return [];
      const profiles = await Promise.all(
        referrals.map(r => 
          base44.entities.UserProfile.filter({ id: r.referred_profile_id }).then(p => p[0])
        )
      );
      return profiles.filter(Boolean);
    },
    enabled: referrals.length > 0
  });

  const referralLink = `${window.location.origin}${createPageUrl('Landing')}?ref=${myProfile?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Afrinnect',
          text: 'Find your perfect match on Afrinnect - African Dating Done Right!',
          url: referralLink
        });
      } catch (err) {
        console.log('Share failed');
      }
    } else {
      handleCopy();
    }
  };

  const stats = {
    total: referrals.length,
    premium: referrals.filter(r => r.conversion_status === 'premium').length,
    rewards: referrals.reduce((sum, r) => sum + (r.reward_earned || 0), 0)
  };

  const nextMilestone = stats.total < 5 ? 5 : stats.total < 10 ? 10 : stats.total < 25 ? 25 : 50;
  const progress = (stats.total / nextMilestone) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50/30 to-amber-50/20 relative pb-24">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Referral Dashboard</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Referrals</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
                </div>
                <Users size={40} className="text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Premium Conversions</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.premium}</p>
                </div>
                <Gift size={40} className="text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rewards Earned</p>
                  <p className="text-3xl font-bold text-green-600">${stats.rewards}</p>
                </div>
                <CheckCircle size={40} className="text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress to Next Milestone */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Next Milestone</h3>
              <span className="text-sm text-gray-600">{stats.total}/{nextMilestone}</span>
            </div>
            <Progress value={progress} className="h-2 mb-3" />
            <p className="text-sm text-gray-600">
              Refer {nextMilestone - stats.total} more {nextMilestone - stats.total === 1 ? 'friend' : 'friends'} to unlock rewards!
            </p>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle>Share Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1"
              />
              <Button onClick={handleCopy} variant="outline">
                {copied ? (
                  <>
                    <CheckCircle size={18} className="mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} className="mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Button onClick={handleShare} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Share2 size={18} className="mr-2" />
              Share Link
            </Button>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">🎁 Referral Rewards</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Get 1 week of Premium free for each referral</li>
                <li>• Earn $10 when they upgrade to Premium</li>
                <li>• Unlock badges and exclusive features</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals ({referrals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No referrals yet. Share your link to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => {
                  const profile = referredProfiles.find(p => p.id === referral.referred_profile_id);
                  return (
                    <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={profile?.primary_photo || profile?.photos?.[0] || 'https://via.placeholder.com/40'}
                          alt={profile?.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">{profile?.display_name || 'New User'}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(referral.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {referral.conversion_status === 'premium' ? (
                          <Badge className="bg-amber-500">Premium User</Badge>
                        ) : (
                          <Badge variant="secondary">Free User</Badge>
                        )}
                        {referral.reward_earned > 0 && (
                          <p className="text-sm text-green-600 mt-1">
                            +${referral.reward_earned}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}