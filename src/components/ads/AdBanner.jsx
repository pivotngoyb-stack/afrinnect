import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdBanner({ placement = 'discovery', userProfile }) {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      // Don't show ads to premium users
      if (userProfile?.is_premium) return;

      try {
        const now = new Date().toISOString();
        const ads = await base44.entities.Advertisement.filter({
          placement,
          is_active: true
        });

        // Filter by date and targeting
        const validAds = ads.filter(ad => {
          const startOk = !ad.start_date || new Date(ad.start_date) <= new Date();
          const endOk = !ad.end_date || new Date(ad.end_date) >= new Date();
          const audienceOk = 
            ad.target_audience === 'all' ||
            ad.target_audience === 'free_users' ||
            (ad.target_audience === 'specific_country' && ad.target_country === userProfile?.current_country);
          
          return startOk && endOk && audienceOk;
        });

        if (validAds.length > 0) {
          const randomAd = validAds[Math.floor(Math.random() * validAds.length)];
          setAd(randomAd);

          // Log impression
          await base44.entities.Advertisement.update(randomAd.id, {
            impressions: (randomAd.impressions || 0) + 1
          });
        }
      } catch (e) {
        console.log('Ad fetch error:', e);
      }
    };

    fetchAd();
  }, [placement, userProfile]);

  const handleClick = async () => {
    if (ad) {
      // Log click
      await base44.entities.Advertisement.update(ad.id, {
        clicks: (ad.clicks || 0) + 1
      });

      // Open link
      window.open(ad.link_url, '_blank');
    }
  };

  if (!ad || dismissed || userProfile?.is_premium) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4"
    >
      <Card className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={handleClick}>
        <div className="absolute top-2 left-2 z-10">
          <span className="text-xs bg-black/50 text-white px-2 py-1 rounded">Sponsored</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
        >
          <X size={16} />
        </Button>
        <img
          src={ad.image_url}
          alt={ad.title}
          className="w-full h-32 object-cover"
        />
        <div className="p-3">
          <h4 className="font-semibold text-sm text-gray-900">{ad.title}</h4>
          {ad.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ad.description}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}