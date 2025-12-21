import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GIFTS = [
  { type: 'rose', name: 'Rose', emoji: '🌹', price: 1.99 },
  { type: 'coffee', name: 'Coffee', emoji: '☕', price: 2.99 },
  { type: 'star', name: 'Star', emoji: '⭐', price: 3.99 },
  { type: 'crown', name: 'Crown', emoji: '👑', price: 4.99 },
  { type: 'heart', name: 'Hearts', emoji: '💕', price: 2.99 },
  { type: 'cultural_gift', name: 'Cultural Gift', emoji: '🎁', price: 9.99 }
];

export default function VirtualGifts() {
  const [myProfile, setMyProfile] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [message, setMessage] = useState('');
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('profileId');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const profile = profiles[0];
          setMyProfile(profile);
          
          // Restrict to Elite and VIP only
          const tier = profile.subscription_tier || 'free';
          if (tier !== 'elite' && tier !== 'vip') {
            window.location.href = createPageUrl('PricingPlans');
          }
        }
      } catch (e) {}
    };
    fetchProfile();
  }, []);

  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.VirtualGift.create({
        gift_type: selectedGift.type,
        gift_name: selectedGift.name,
        gift_emoji: selectedGift.emoji,
        price_usd: selectedGift.price,
        sender_profile_id: myProfile.id,
        receiver_profile_id: profileId,
        message: message,
        is_seen: false
      });

      await base44.entities.Notification.create({
        user_profile_id: profileId,
        type: 'gift',
        title: `${selectedGift.emoji} Gift Received!`,
        message: `${myProfile.display_name} sent you a ${selectedGift.name}${message ? ': ' + message : ''}`,
        from_profile_id: myProfile.id
      });
    },
    onSuccess: () => {
      alert('Gift sent! 🎁');
      window.location.href = createPageUrl('Home');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 pb-24">
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl(`Profile?id=${profileId}`)}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Send a Gift</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {GIFTS.map(gift => (
            <motion.div
              key={gift.type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  selectedGift?.type === gift.type
                    ? 'ring-2 ring-purple-600 shadow-lg'
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedGift(gift)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-5xl mb-2">{gift.emoji}</div>
                  <p className="font-semibold text-sm">{gift.name}</p>
                  <p className="text-xs text-gray-500">${gift.price}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {selectedGift && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card>
              <CardContent className="p-4">
                <Label htmlFor="message">Add a message (optional)</Label>
                <Input
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something sweet..."
                  className="mt-2"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/100
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={() => sendGiftMutation.mutate()}
              disabled={sendGiftMutation.isPending}
              className="w-full py-6 text-lg bg-gradient-to-r from-pink-600 to-purple-600"
            >
              <Send size={20} className="mr-2" />
              Send {selectedGift.emoji} for ${selectedGift.price}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}