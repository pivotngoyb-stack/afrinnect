import React from 'react';
import ComingSoon from '@/components/shared/ComingSoon';
import { ShoppingBag } from 'lucide-react';

export default function Marketplace() {
  return (
    <ComingSoon 
      title="Marketplace" 
      description="A secure place to find trusted vendors and services within the Afrinnect community. Launching soon!"
      icon={ShoppingBag}
    />
  );
}