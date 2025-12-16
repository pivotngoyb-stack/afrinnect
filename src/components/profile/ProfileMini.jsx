import React from 'react';
import { MapPin, Heart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import VerificationBadge from '../shared/VerificationBadge';
import CountryFlag from '../shared/CountryFlag';

export default function ProfileMini({ profile, onClick }) {
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = calculateAge(profile?.birth_date);
  const photo = profile?.primary_photo || profile?.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  const relationshipLabels = {
    dating: 'Dating',
    serious_relationship: 'Serious',
    marriage: 'Marriage',
    friendship: 'Friends',
    networking: 'Network'
  };

  return (
    <div 
      onClick={onClick}
      className="relative bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
    >
      <div className="relative aspect-[3/4]">
        <img
          src={photo}
          alt={profile?.display_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Verification Badge */}
        <div className="absolute top-3 right-3">
          <VerificationBadge verification={profile?.verification_status} size="small" />
        </div>

        {/* Online Indicator */}
        {profile?.is_active && (
          <div className="absolute top-3 left-3 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg truncate">{profile?.display_name}</h3>
            {age && <span className="font-light">{age}</span>}
          </div>

          <div className="flex items-center gap-1 text-white/80 text-xs mb-2">
            <CountryFlag country={profile?.country_of_origin} size="small" showName={false} />
            <span className="truncate">{profile?.current_city}</span>
          </div>

          {profile?.relationship_goal && (
            <Badge className="bg-purple-600/70 text-white text-xs border-0">
              <Heart size={10} className="mr-1" />
              {relationshipLabels[profile.relationship_goal]}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}