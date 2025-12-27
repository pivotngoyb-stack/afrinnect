import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MessageSquare, Globe, UserCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AfricanPattern from '@/components/shared/AfricanPattern';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

export default function LanguageExchangeHub() {
  const [myProfile, setMyProfile] = useState(null);
  const [offerLanguage, setOfferLanguage] = useState('');
  const [learnLanguage, setLearnLanguage] = useState('');
  const [messageText, setMessageText] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
          setOfferLanguage(profiles[0].preferred_language || '');
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };
    fetchProfile();
  }, []);

  const { data: exchangePartners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ['exchange-partners', myProfile?.id, offerLanguage, learnLanguage],
    queryFn: async () => {
      if (!myProfile || !offerLanguage || !learnLanguage) return [];

      const partners = await base44.entities.UserProfile.filter({
        languages: { $in: [learnLanguage] },
        id: { $ne: myProfile.id, $nin: myProfile.blocked_users || [] }
      });

      return partners;
    },
    enabled: !!myProfile && !!offerLanguage && !!learnLanguage,
    staleTime: 300000,
    retry: 1
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverProfileId, message }) => {
      await base44.entities.Notification.create({
        user_profile_id: receiverProfileId,
        type: 'message',
        title: `Language Exchange request from ${myProfile.display_name}`,
        message: message,
        from_profile_id: myProfile.id,
        link_to: createPageUrl('Chat')
      });
    },
    onSuccess: () => {
      toast.success("Message sent! Hopefully, they'll connect soon.");
      setMessageText('');
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    }
  });

  const handleSendMessage = (partnerId) => {
    if (!messageText.trim()) {
      toast.error("Message cannot be empty.");
      return;
    }
    sendMessageMutation.mutate({ receiverProfileId: partnerId, message: messageText });
  };

  const availableLanguages = [
    "English", "French", "Swahili", "Yoruba", "Hausa", "Igbo", "Amharic", "Arabic",
    "Portuguese", "Spanish", "German", "Italian", "Zulu", "Xhosa", "Afrikaans",
    "Lingala", "Luganda", "Kinyarwanda", "Somali", "Twi", "Wolof"
  ].sort();

  if (loadingPartners) {
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
          <h1 className="text-lg font-bold">Language Exchange Hub</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Connect & Learn New Languages</h2>
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Find language exchange partners from diverse backgrounds. Practice speaking, improve your vocabulary, and explore new cultures!
        </p>

        <Card className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={24} className="text-purple-600" />
              Your Exchange Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offer-lang">I can offer:</Label>
              <Select value={offerLanguage} onValueChange={setOfferLanguage}>
                <SelectTrigger id="offer-lang" className="bg-gray-100 border-gray-300">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="learn-lang">I want to learn:</Label>
              <Select value={learnLanguage} onValueChange={setLearnLanguage}>
                <SelectTrigger id="learn-lang" className="bg-gray-100 border-gray-300">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => queryClient.invalidateQueries(['exchange-partners'])} className="md:col-span-2 bg-purple-600 hover:bg-purple-700">
              <RefreshCw size={20} className="mr-2" />
              Find Partners
            </Button>
          </CardContent>
        </Card>

        <h3 className="text-2xl font-bold text-gray-800 mb-4">Suggested Partners</h3>
        {exchangePartners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exchangePartners.map(partner => (
              <Card key={partner.id} className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg">
                <CardContent className="p-4 flex items-center gap-4">
                  <img
                    src={partner.primary_photo || partner.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
                    alt={partner.display_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{partner.display_name}</h4>
                    <p className="text-sm text-gray-600">Offers: {partner.languages?.join(', ') || 'N/A'}</p>
                  </div>
                  <Link to={createPageUrl(`Profile?id=${partner.id}`)}>
                    <Button variant="outline" size="sm">
                      <UserCircle size={16} />
                    </Button>
                  </Link>
                </CardContent>
                <div className="p-4 border-t border-gray-100">
                  <Textarea
                    placeholder={`Message ${partner.display_name}...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="mb-2"
                  />
                  <Button
                    onClick={() => handleSendMessage(partner.id)}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare size={18} className="mr-2" />
                    Send Message
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No partners found matching your criteria. Try adjusting your preferences!</p>
        )}
      </main>
    </div>
  );
}