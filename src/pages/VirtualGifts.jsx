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
import StripePaymentModal from '@/components/payment/StripePaymentModal';
import { useQuery } from '@tanstack/react-query';

const GIFTS = [
  // Classics
  { type: 'rose', name: 'Rose', emoji: '🌹', price: 1.99 },
  { type: 'chocolate', name: 'Chocolate', emoji: '🍫', price: 2.99 },
  { type: 'coffee', name: 'Coffee', emoji: '☕', price: 2.99 },
  { type: 'cocktail', name: 'Cocktail', emoji: '🍸', price: 4.99 },
  { type: 'heart', name: 'Love', emoji: '❤️', price: 1.99 },
  { type: 'kiss', name: 'Kiss', emoji: '💋', price: 1.99 },
  
  // Luxury
  { type: 'diamond', name: 'Diamond', emoji: '💎', price: 9.99 },
  { type: 'ring', name: 'Ring', emoji: '💍', price: 14.99 },
  { type: 'crown', name: 'Crown', emoji: '👑', price: 4.99 },
  { type: 'champagne', name: 'Champagne', emoji: '🍾', price: 19.99 },
  { type: 'money_bag', name: 'Bag of Cash', emoji: '💰', price: 24.99 },
  { type: 'airplane', name: 'Trip', emoji: '✈️', price: 49.99 },
  { type: 'car', name: 'Sports Car', emoji: '🏎️', price: 29.99 },
  { type: 'house', name: 'Mansion', emoji: '🏰', price: 99.99 },
  
  // Fun & Cute
  { type: 'teddy', name: 'Teddy Bear', emoji: '🧸', price: 5.99 },
  { type: 'balloon', name: 'Balloon', emoji: '🎈', price: 1.99 },
  { type: 'party', name: 'Party', emoji: '🎉', price: 3.99 },
  { type: 'fire', name: 'Hot', emoji: '🔥', price: 0.99 },
  { type: 'star', name: 'Star', emoji: '⭐', price: 3.99 },
  { type: 'trophy', name: 'Champion', emoji: '🏆', price: 4.99 },

  // African Cultural
  { type: 'kente', name: 'Kente Cloth', emoji: '🧣', price: 9.99 },
  { type: 'drum', name: 'Djembe Drum', emoji: '🥁', price: 7.99 },
  { type: 'beads', name: 'Waist Beads', emoji: '📿', price: 5.99 },
  { type: 'kola', name: 'Kola Nuts', emoji: '🌰', price: 2.99 },
  { type: 'fan', name: 'Hand Fan', emoji: '🪭', price: 4.99 },
  { type: 'mask', name: 'Tribal Mask', emoji: '👺', price: 12.99 }
];

export default function VirtualGifts() {
  const [myProfile, setMyProfile] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [message, setMessage] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('profileId');

  const { data: stripeConfig } = useQuery({
    queryKey: ['stripeConfig'],
    queryFn: async () => {
        const response = await base44.functions.invoke('getStripeConfig', {});
        return response.data;
    },
    staleTime: Infinity
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
        const profile = profiles[0];
        setMyProfile(profile);
        }
      } catch (e) {}
    };
    fetchProfile();
  }, []);

  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      // Use backend function to handle all logic (finding match, notification, etc.)
      const response = await base44.functions.invoke('sendVirtualGift', {
        receiver_profile_id: profileId,
        gift_type: selectedGift.type,
        gift_emoji: selectedGift.emoji,
        message: message
      });
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      setShowPayment(false);
      alert('Gift sent! 🎁');
      window.location.href = createPageUrl('Home');
    }
  });

  const handleInitiatePayment = async () => {
      if (!selectedGift) return;
      
      try {
          const response = await base44.functions.invoke('createStripePaymentIntent', {
              amount: selectedGift.price,
              currency: 'usd',
              planType: 'virtual_gift',
              billingPeriod: 'one_time',
              giftType: selectedGift.type
          });
          
          if (response.data?.clientSecret) {
              setClientSecret(response.data.clientSecret);
              setShowPayment(true);
          }
      } catch (error) {
          console.error("Payment init failed", error);
          alert("Failed to initialize payment");
      }
  };

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
              onClick={handleInitiatePayment}
              disabled={sendGiftMutation.isPending}
              className="w-full py-6 text-lg bg-gradient-to-r from-pink-600 to-purple-600"
            >
              <Send size={20} className="mr-2" />
              Send {selectedGift.emoji} for ${selectedGift.price}
            </Button>
          </motion.div>
        )}
      </main>

      <StripePaymentModal 
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          clientSecret={clientSecret}
          amount={selectedGift?.price}
          planName={`Virtual Gift: ${selectedGift?.name}`}
          stripePublicKey={stripeConfig?.publicKey}
          onSuccess={() => sendGiftMutation.mutate()}
      />
    </div>
  );
}