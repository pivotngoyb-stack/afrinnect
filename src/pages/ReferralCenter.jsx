import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Share2, Copy, Gift, Crown, Users, DollarSign, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import confetti from 'canvas-confetti';

export default function ReferralCenter() {
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

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', myProfile?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_profile_id: myProfile.id }),
    enabled: !!myProfile
  });

  const totalRewards = referrals.reduce((sum, r) => sum + (r.reward_earned || 0), 0);
  const successfulReferrals = referrals.filter(r => r.conversion_status === 'subscribed').length;

  const referralUrl = `https://afrinnect-658a9066.base44.app?ref=${myProfile?.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    confetti({ particleCount: 50, spread: 60 });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Afrinnect!',
          text: 'Find meaningful connections with people who share your African heritage. Join me on Afrinnect!',
          url: referralUrl
        });
      } catch (e) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const rewardTiers = [
    { referrals: 1, reward: '$5', feature: '1 week Premium free' },
    { referrals: 5, reward: '$25', feature: '1 month Premium free' },
    { referrals: 10, reward: '$50', feature: '3 months Premium free' },
    { referrals: 25, reward: '$125', feature: 'Lifetime Premium' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Refer & Earn</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-purple-600 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold mb-1">${totalRewards}</h2>
                <p className="text-white/80">Total Earned</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Gift size={32} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-2xl font-bold">{referrals.length}</p>
                <p className="text-white/80 text-sm">Total Referrals</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{successfulReferrals}</p>
                <p className="text-white/80 text-sm">Premium Conversions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 size={20} />
              Share Your Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={referralUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyLink} variant="outline">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </Button>
            </div>
            <Button onClick={shareLink} className="w-full bg-purple-600">
              <Share2 size={18} className="mr-2" />
              Share Link
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Your friends get 1 week Premium free when they sign up!
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-purple-600">1</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Share Your Link</h4>
                <p className="text-sm text-gray-600">Send your unique referral link to friends</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-amber-600">2</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">They Sign Up</h4>
                <p className="text-sm text-gray-600">Friends join Afrinnect using your link</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-green-600">3</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Earn Rewards</h4>
                <p className="text-sm text-gray-600">Get cash & Premium features for each referral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown size={20} />
              Reward Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rewardTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 ${
                  referrals.length >= tier.referrals
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{tier.referrals} Referrals</p>
                    <p className="text-sm text-gray-600">{tier.feature}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">{tier.reward}</p>
                    {referrals.length >= tier.referrals && (
                      <Badge className="bg-green-600 text-xs">Unlocked</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referrals.slice(0, 5).map((ref, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">New User</p>
                        <p className="text-xs text-gray-500">
                          {new Date(ref.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={ref.conversion_status === 'subscribed' ? 'default' : 'outline'}>
                      {ref.conversion_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}