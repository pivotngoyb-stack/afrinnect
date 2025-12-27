import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Share2, Clipboard, CheckCircle2, UserPlus, TrendingUp, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AfricanPattern from '@/components/shared/AfricanPattern';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

export default function ReferralProgram() {
  const [myProfile, setMyProfile] = useState(null);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };
    fetchProfile();
  }, []);

  const { data: myReferrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ['my-referrals', myProfile?.id],
    queryFn: () => myProfile ? base44.entities.Referral.filter({ referrer_id: myProfile.id }) : [],
    enabled: !!myProfile,
    staleTime: 300000,
    retry: 1
  });

  useEffect(() => {
    if (myProfile) {
      setReferralLink(`${window.location.origin}${createPageUrl('Landing')}?ref=${myProfile.id}`);
    }
  }, [myProfile]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Afrinnect Referral Program',
          text: 'Join Afrinnect and find your perfect match! Use my referral link:',
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  if (loadingReferrals) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative pb-24">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Referral Program</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Invite Friends, Earn Rewards!</h2>
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Share Afrinnect with your friends and both of you will receive exciting rewards when they sign up and become active members.
        </p>

        <Card className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift size={24} className="text-purple-600" />
              Your Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-gray-100 border-gray-300 text-gray-700"
              />
              <Button onClick={handleCopyLink} variant="outline" size="icon">
                <Clipboard size={20} />
              </Button>
            </div>
            <Button onClick={handleShare} className="w-full bg-purple-600 hover:bg-purple-700">
              <Share2 size={20} className="mr-2" />
              Share Now
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={24} className="text-amber-600" />
              Your Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myReferrals?.length > 0 ? (
              <div className="space-y-3">
                {myReferrals.map(referral => (
                  <div key={referral.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <UserPlus size={20} className="text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-800">{referral.referred_email}</p>
                        <p className="text-sm text-gray-500">Joined: {new Date(referral.created_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {referral.status === 'completed' ? (
                      <Badge className="bg-green-500"><CheckCircle2 size={16} className="mr-1" />Reward Claimed</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No referrals yet. Start sharing!</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award size={24} className="text-green-600" />
              How Rewards Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>1. Share your unique referral link with friends.</p>
            <p>2. When a friend signs up using your link and becomes an active member, both of you earn rewards!</p>
            <p>3. Rewards will be automatically applied to your account.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}