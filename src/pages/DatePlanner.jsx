import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DatePlanner() {
  const [myProfile, setMyProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId');

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

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest 3 date ideas in ${myProfile.current_city}, ${myProfile.current_country} for a culturally-minded couple. Include venue name, type, estimated budget, and why it's good for a first date.

Return JSON array:
[
  {
    "venue_name": "African Art Museum",
    "venue_address": "123 Main St",
    "date_type": "cultural_event",
    "budget_estimate": 30,
    "description": "Great conversation starter"
  }
]`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  venue_name: { type: "string" },
                  venue_address: { type: "string" },
                  date_type: { type: "string" },
                  budget_estimate: { type: "number" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });
      setSuggestions(result.suggestions || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const suggestDateMutation = useMutation({
    mutationFn: async (suggestion) => {
      const response = await base44.functions.invoke('proposeDate', {
        matchId,
        suggestion
      });
      return response.data;
    },
    onSuccess: () => {
      alert('Date suggestion sent!');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-24">
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl(`Chat?matchId=${matchId}`)}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Plan a Date</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {suggestions.length === 0 ? (
          <Card className="text-center">
            <CardContent className="p-8">
              <Sparkles size={64} className="mx-auto text-purple-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">AI Date Planner</h2>
              <p className="text-gray-600 mb-6">
                Get personalized date suggestions for your area
              </p>
              <Button 
                onClick={generateSuggestions}
                disabled={loading || !myProfile}
                className="bg-purple-600"
              >
                {loading ? 'Finding Ideas...' : 'Get Suggestions'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {suggestions.map((suggestion, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">{suggestion.venue_name}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} />
                      {suggestion.venue_address}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign size={16} />
                      ~${suggestion.budget_estimate} per person
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{suggestion.description}</p>
                  <Button 
                    onClick={() => suggestDateMutation.mutate(suggestion)}
                    className="w-full"
                  >
                    Suggest This Date
                  </Button>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </main>
    </div>
  );
}