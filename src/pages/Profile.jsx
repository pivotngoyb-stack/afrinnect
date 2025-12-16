import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Settings, Edit2, Camera, Shield, Star, Crown, MapPin,
  Briefcase, GraduationCap, Book, Languages, Heart, ChevronRight,
  LogOut, HelpCircle, Bell, Lock, Eye, Award, Sparkles, BarChart, IdCard, RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VerificationBadge from '@/components/shared/VerificationBadge';
import CountryFlag from '@/components/shared/CountryFlag';
import AfricanPattern from '@/components/shared/AfricanPattern';

export default function Profile() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('id');
  
  const [myProfile, setMyProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
            setIsOwnProfile(!profileId || profileId === profiles[0].id);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchMyProfile();
  }, [profileId]);

  // Fetch profile to view
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', profileId || myProfile?.id],
    queryFn: async () => {
      const id = profileId || myProfile?.id;
      if (!id) return null;
      const profiles = await base44.entities.UserProfile.filter({ id });
      return profiles[0];
    },
    enabled: !!profileId || !!myProfile
  });

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.display_name,
      profile.bio,
      profile.photos?.length > 0,
      profile.birth_date,
      profile.country_of_origin,
      profile.current_city,
      profile.profession,
      profile.education,
      profile.religion,
      profile.relationship_goal,
      profile.interests?.length > 0,
      profile.cultural_values?.length > 0,
      profile.languages?.length > 0
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const photo = profile?.primary_photo || profile?.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';
  const age = calculateAge(profile?.birth_date);
  const completion = calculateProfileCompletion();

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Home'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative pb-24">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      {/* Header */}
      <header className="relative">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-br from-purple-600 via-purple-700 to-amber-600 relative overflow-hidden">
          <AfricanPattern className="text-white" opacity={0.1} />
        </div>

        {/* Profile Photo */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-16">
          <div className="relative">
            <img
              src={photo}
              alt={profile?.display_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
            />
            {isOwnProfile && (
              <Link to={createPageUrl('EditProfile')}>
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition">
                  <Camera size={18} className="text-white" />
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Settings Button */}
        {isOwnProfile && (
          <Link to={createPageUrl('Settings')} className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" className="bg-white/20 backdrop-blur text-white hover:bg-white/30">
              <Settings size={20} />
            </Button>
          </Link>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-20">
        {/* Name & Basic Info */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile?.display_name}{age && `, ${age}`}
            </h1>
            <VerificationBadge verification={profile?.verification_status} />
          </div>
          
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
            <CountryFlag country={profile?.country_of_origin} size="small" />
            {profile?.tribe_ethnicity && (
              <span>• {profile.tribe_ethnicity}</span>
            )}
          </div>

          <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin size={14} />
            <span>{profile?.current_city}, {profile?.current_country}</span>
          </div>

          {profile?.is_premium && (
            <Badge className="mt-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <Crown size={12} className="mr-1" />
              Premium Member
            </Badge>
          )}
        </div>

        {/* Profile Completion (Own profile only) */}
        {isOwnProfile && completion < 100 && (
          <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-purple-600">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2 mb-3" />
              <p className="text-xs text-gray-500">
                Complete your profile to get more matches!
              </p>
              <Link to={createPageUrl('EditProfile')}>
                <Button size="sm" className="mt-3 w-full bg-purple-600 hover:bg-purple-700">
                  Complete Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Bio */}
        {profile?.bio && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-gray-700">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {profile?.profession && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Work</p>
                  <p className="text-sm font-medium text-gray-800">{profile.profession}</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {profile?.education && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <GraduationCap size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Education</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{profile.education?.replace('_', ' ')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {profile?.religion && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Book size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Religion</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{profile.religion?.replace('_', ' ')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {profile?.relationship_goal && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Heart size={16} className="text-pink-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Looking For</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{profile.relationship_goal?.replace('_', ' ')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Languages */}
        {profile?.languages?.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Languages size={16} className="text-purple-600" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-gray-100">
                    {lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interests */}
        {profile?.interests?.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles size={16} className="text-amber-600" />
                Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-700">
                    {interest}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cultural Values */}
        {profile?.cultural_values?.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award size={16} className="text-green-600" />
                Cultural Values
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {profile.cultural_values.map((value, idx) => (
                  <Badge key={idx} variant="outline" className="border-amber-300 text-amber-700">
                    {value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompts */}
        {profile?.prompts?.length > 0 && (
          <div className="space-y-3 mb-6">
            {profile.prompts.map((prompt, idx) => (
              <Card key={idx} className="bg-gradient-to-br from-purple-50 to-amber-50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-purple-700 mb-2">{prompt.question}</p>
                  <p className="text-gray-700">{prompt.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Action Buttons (Own profile) */}
        {isOwnProfile && (
          <div className="space-y-3 mt-8">
            <Link to={createPageUrl('Analytics')}>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" size="lg">
                <BarChart size={18} className="mr-2" />
                View Analytics
                {profile?.is_premium && <Badge className="ml-2 bg-amber-500 text-xs">Premium</Badge>}
              </Button>
            </Link>

            {!profile?.verification_status?.photo_verified && (
              <Link to={createPageUrl('VerifyPhoto')}>
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                  <Shield size={18} className="mr-2" />
                  Verify Your Photo
                </Button>
              </Link>
            )}

            {!profile?.verification_status?.phone_verified && (
              <Link to={createPageUrl('PhoneVerification')}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <Shield size={18} className="mr-2" />
                  Verify Your Phone
                </Button>
              </Link>
            )}

            {!profile?.verification_status?.id_verified && (
              <Link to={createPageUrl('IDVerification')}>
                <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg">
                  <IdCard size={18} className="mr-2" />
                  Verify Your Age (18+)
                </Button>
              </Link>
            )}

            <Link to={createPageUrl('SuccessStories')}>
              <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700" size="lg">
                <Heart size={18} className="mr-2" />
                Success Stories
              </Button>
            </Link>

            <Link to={createPageUrl('EditProfile')}>
              <Button className="w-full bg-purple-600 hover:bg-purple-700" size="lg">
                <Edit2 size={18} className="mr-2" />
                Edit Profile
              </Button>
            </Link>

            <Link to={createPageUrl('PricingPlans')}>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" size="lg">
                <Crown size={18} className="mr-2" />
                {profile?.is_premium ? 'Manage Subscription' : 'Upgrade to Premium'}
              </Button>
            </Link>

            {profile?.is_premium && (
              <>
                <Link to={createPageUrl('TravelMode')}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" size="lg">
                    <MapPin size={18} className="mr-2" />
                    Travel Mode
                  </Button>
                </Link>

                <Link to={createPageUrl('Rewind')}>
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700" size="lg">
                    <RotateCcw size={18} className="mr-2" />
                    Rewind
                  </Button>
                </Link>
              </>
            )}

            <Separator className="my-6" />

            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut size={18} className="mr-2" />
              Log Out
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}