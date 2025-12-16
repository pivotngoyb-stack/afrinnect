import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Languages, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LanguageExchangeHub() {
  const [myProfile, setMyProfile] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      } catch (e) {}
    };
    fetchProfile();
  }, []);

  const { data: partners = [] } = useQuery({
    queryKey: ['language-partners'],
    queryFn: async () => {
      const exchanges = await base44.entities.LanguageExchange.filter({ available_for_exchange: true });
      const profileIds = exchanges.map(e => e.user_profile_id).filter(id => id !== myProfile?.id);
      const profiles = await Promise.all(
        profileIds.slice(0, 20).map(id => 
          base44.entities.UserProfile.filter({ id }).then(p => p[0])
        )
      );
      return profiles.filter(Boolean).map((p, idx) => ({
        ...p,
        exchange: exchanges[idx]
      }));
    },
    enabled: !!myProfile
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-24">
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Languages size={20} className="text-blue-600" />
            <h1 className="font-bold text-lg">Language Exchange</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6 text-center">
            <Languages size={48} className="mx-auto text-blue-600 mb-3" />
            <h2 className="font-bold text-xl mb-2">Find Language Partners</h2>
            <p className="text-gray-600">
              Connect with people to practice languages and learn about cultures
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {partners.map(partner => (
            <Card key={partner.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={partner.primary_photo || partner.photos?.[0]}
                    alt={partner.display_name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{partner.display_name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {partner.current_city}, {partner.current_country}
                    </p>
                    
                    {partner.exchange?.teaching_languages?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Teaches:</p>
                        <div className="flex flex-wrap gap-1">
                          {partner.exchange.teaching_languages.map((lang, idx) => (
                            <Badge key={idx} className="bg-blue-100 text-blue-700 text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {partner.exchange?.learning_languages?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Learning:</p>
                        <div className="flex flex-wrap gap-1">
                          {partner.exchange.learning_languages.map((lang, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link to={createPageUrl(`Profile?id=${partner.id}`)}>
                      <Button size="sm" variant="outline" className="w-full gap-1">
                        <MessageCircle size={14} />
                        Connect
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {partners.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No language partners available yet</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}