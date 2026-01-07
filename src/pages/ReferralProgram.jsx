import React from 'react';
import ComingSoon from '@/components/shared/ComingSoon';
import { Gift } from 'lucide-react';

export default function ReferralProgram() {
  return (
    <ComingSoon 
      title="Referral Program" 
      description="Invite friends and earn rewards! We are finalizing the details of our exciting referral program."
      icon={Gift}
    />
  );
}