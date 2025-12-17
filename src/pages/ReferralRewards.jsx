import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Copy, CheckCircle, Users, Crown, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ReferralRewards() {
  const [myProfile, setMyProfile] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const user = await base44.auth.me();
      if (user) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      }
    };
    fetchProfile();
  }, []);

  // Generate referral code
  const referralCode = myProfile ? `AFR${myProfile.id.slice(0, 8).toUpperCase()}` : '';
  const referralLink = `${window.location.origin}${createPageUrl('Landing')}?ref=${referralCode}`;

  // Fetch user's referrals
  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', myProfile?.id],
    queryFn: () => base44.entities.Referral.filter({ referrer_id: myProfile.id }, '-created_date'),
    enabled: !!myProfile
  });

  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Afrinnect - African Dating App',
          text: 'Find meaningful connections on Afrinnect! Use my code to get 1 week free premium.',
          url: referralLink
        });
      } catch (e) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Referral Rewards</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero Card */}
        <Card className="mb-6 bg-gradient-to-br from-purple-600 to-amber-600 border-0 text-white">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <Gift size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Give 1 Week Free, Get 1 Month Free!</h2>
            <p className="text-white/90 mb-6">
              When your friend subscribes to premium, you both win!
            </p>
            <div className="flex gap-3">
              <Button onClick={handleShare} className="flex-1 bg-white text-purple-600 hover:bg-gray-100">
                <Share2 size={18} className="mr-2" />
                Share Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="flex-1" />
              <Button onClick={handleCopy} variant="outline">
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Share this link with friends to earn rewards</p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{completedReferrals.length}</p>
              <p className="text-sm text-gray-600">Successful Referrals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{pendingReferrals.length}</p>
              <p className="text-sm text-gray-600">Pending Sign-ups</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{completedReferrals.length}</p>
              <p className="text-sm text-gray-600">Months Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">1</div>
              <div>
                <p className="font-semibold">Share Your Link</p>
                <p className="text-sm text-gray-600">Send your referral link to friends via social media, WhatsApp, or text</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">2</div>
              <div>
                <p className="font-semibold">Friend Signs Up</p>
                <p className="text-sm text-gray-600">They create an account and get 1 week free premium</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">3</div>
              <div>
                <p className="font-semibold">Friend Subscribes</p>
                <p className="text-sm text-gray-600">When they purchase premium, you get 1 month free!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        {referrals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Referral #{ref.referral_code}</p>
                      <p className="text-xs text-gray-500">{new Date(ref.created_date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={
                      ref.status === 'rewarded' ? 'bg-green-600' :
                      ref.status === 'completed' ? 'bg-blue-600' :
                      'bg-gray-400'
                    }>
                      {ref.status}
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