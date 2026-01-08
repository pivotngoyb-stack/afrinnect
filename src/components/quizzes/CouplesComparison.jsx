import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Heart, Users, CheckCircle2, AlertCircle, Lock, 
  Sparkles, ArrowRight, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BraintreeDropIn from '@/components/payment/BraintreeDropIn';
import AfricanPattern from '@/components/shared/AfricanPattern';
import { Badge } from "@/components/ui/badge";

export default function CouplesComparison({ isOpen, onClose }) {
  const [step, setStep] = useState('select'); // select, pay, result
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedMatchProfile, setSelectedMatchProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setMyProfile(profiles[0]);
        
        // Fetch matches
        const matchesData = await base44.entities.Match.filter({
          $or: [{ user1_id: profiles[0].id }, { user2_id: profiles[0].id }],
          is_match: true
        });

        // Fetch match profiles
        const matchProfiles = [];
        for (const match of matchesData) {
          const otherId = match.user1_id === profiles[0].id ? match.user2_id : match.user1_id;
          const otherProfile = await base44.entities.UserProfile.filter({ id: otherId });
          if (otherProfile.length > 0) {
            matchProfiles.push(otherProfile[0]);
          }
        }
        setMatches(matchProfiles);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = (matchId) => {
    setSelectedMatchId(matchId);
    setSelectedMatchProfile(matches.find(m => m.id === matchId));
  };

  const handlePaymentSuccess = async (data) => {
    setStep('analyzing');
    // Simulate analysis delay
    setTimeout(() => {
      generateComparison();
      setStep('result');
    }, 2000);
  };

  const generateComparison = () => {
    if (!myProfile || !selectedMatchProfile) return;

    // Simple compatibility logic (can be replaced with AI later)
    let score = 65; // Base score
    const positives = [];
    const challenges = [];

    // Age Gap
    const ageGap = Math.abs(
      new Date(myProfile.birth_date).getFullYear() - 
      new Date(selectedMatchProfile.birth_date).getFullYear()
    );
    if (ageGap < 5) {
      score += 10;
      positives.push("Similar life stage (Age)");
    } else if (ageGap > 10) {
      challenges.push("Different generational perspectives");
    }

    // Interests
    const commonInterests = myProfile.interests?.filter(i => 
      selectedMatchProfile.interests?.includes(i)
    ) || [];
    if (commonInterests.length > 2) {
      score += 15;
      positives.push(`Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
    }

    // Religion
    if (myProfile.religion === selectedMatchProfile.religion) {
      score += 10;
      positives.push("Shared spiritual values");
    }

    // Cap score
    score = Math.min(98, Math.max(40, score));

    setComparisonResult({
      score,
      positives,
      challenges: challenges.length > 0 ? challenges : ["Keep communication open to bridge differences"],
      summary: score > 80 ? "A match made in heaven! You two have incredible potential." : 
               score > 60 ? "Strong potential with some work needed." : 
               "Opposites attract, but it will take effort."
    });
  };

  const reset = () => {
    setStep('select');
    setSelectedMatchId(null);
    setSelectedMatchProfile(null);
    setComparisonResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-2xl">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center relative overflow-hidden">
          <AfricanPattern className="text-white" opacity={0.1} />
          <h2 className="text-2xl font-bold relative z-10">Couples Comparison</h2>
          <p className="text-white/80 relative z-10">Deep dive into your compatibility</p>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto text-purple-200 mb-4" />
                <p className="text-gray-600 mb-4">
                  Select a match to unlock a detailed compatibility report comparing your values, lifestyle, and long-term goals.
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-600" />
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Choose a partner:</label>
                    <Select onValueChange={handleMatchSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a match..." />
                      </SelectTrigger>
                      <SelectContent>
                        {matches.map(match => (
                          <SelectItem key={match.id} value={match.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={match.primary_photo} />
                                <AvatarFallback>{match.display_name[0]}</AvatarFallback>
                              </Avatar>
                              {match.display_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    disabled={!selectedMatchId}
                    onClick={() => setStep('pay')}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">You need matches to use this feature!</p>
                  <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
                </div>
              )}
            </div>
          )}

          {step === 'pay' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                  <AvatarImage src={myProfile?.primary_photo} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <Heart className="text-pink-500 fill-pink-500 animate-pulse" />
                <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                  <AvatarImage src={selectedMatchProfile?.primary_photo} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
              </div>

              <div className="bg-purple-50 p-4 rounded-xl text-center mb-4">
                <h3 className="font-bold text-purple-900 text-lg">Unlock Full Report</h3>
                <p className="text-purple-700 text-sm mb-2">Get insights on:</p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <Badge variant="secondary" className="bg-white">Values</Badge>
                  <Badge variant="secondary" className="bg-white">Lifestyle</Badge>
                  <Badge variant="secondary" className="bg-white">Goals</Badge>
                  <Badge variant="secondary" className="bg-white">Horoscope</Badge>
                </div>
              </div>

              <BraintreeDropIn 
                amount={2.00}
                planName="Couples Comparison"
                purchaseType="one_time"
                onSuccess={handlePaymentSuccess}
                onError={(err) => alert("Payment failed: " + err)}
              />
              
              <Button variant="ghost" className="w-full mt-2" onClick={() => setStep('select')}>
                Back
              </Button>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">Analyzing Compatibility...</h3>
              <p className="text-gray-500">Comparing stars, values, and hearts</p>
            </div>
          )}

          {step === 'result' && comparisonResult && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="text-center">
                <div className="relative inline-block">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      className="text-gray-200"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className="text-purple-600"
                      strokeWidth="8"
                      strokeDasharray={365}
                      strokeDashoffset={365 - (365 * comparisonResult.score) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-3xl font-bold text-purple-600">{comparisonResult.score}%</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mt-4">{comparisonResult.summary}</h3>
              </div>

              <div className="space-y-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} /> Strengths
                    </h4>
                    <ul className="space-y-1 text-sm text-green-700">
                      {comparisonResult.positives.map((p, i) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                      <AlertCircle size={16} /> Areas to Grow
                    </h4>
                    <ul className="space-y-1 text-sm text-amber-700">
                      {comparisonResult.challenges.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Button className="w-full bg-gray-900 text-white" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}