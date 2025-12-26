import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ConversionFunnel() {
  const { data: funnelData } = useQuery({
    queryKey: ['conversion-funnel'],
    queryFn: async () => {
      const analytics = await base44.entities.ProfileAnalytics.filter({});
      
      const events = analytics.reduce((acc, a) => {
        acc[a.event_type] = (acc[a.event_type] || 0) + 1;
        return acc;
      }, {});

      const landingViews = events.landing_viewed || 0;
      const signupStarts = events.signup_started || 0;
      const profilesCreated = events.profile_created || 0;
      const firstLikes = events.first_like_sent || 0;
      const firstMatches = events.first_match_created || 0;
      const premiumViews = events.premium_page_viewed || 0;
      const premiumPurchases = events.premium_purchased || 0;

      return {
        stages: [
          { name: 'Landing Views', count: landingViews, percent: 100 },
          { name: 'Signup Started', count: signupStarts, percent: landingViews ? (signupStarts / landingViews * 100).toFixed(1) : 0 },
          { name: 'Profile Created', count: profilesCreated, percent: signupStarts ? (profilesCreated / signupStarts * 100).toFixed(1) : 0 },
          { name: 'First Like', count: firstLikes, percent: profilesCreated ? (firstLikes / profilesCreated * 100).toFixed(1) : 0 },
          { name: 'First Match', count: firstMatches, percent: firstLikes ? (firstMatches / firstLikes * 100).toFixed(1) : 0 },
          { name: 'Premium View', count: premiumViews, percent: profilesCreated ? (premiumViews / profilesCreated * 100).toFixed(1) : 0 },
          { name: 'Premium Purchase', count: premiumPurchases, percent: premiumViews ? (premiumPurchases / premiumViews * 100).toFixed(1) : 0 }
        ]
      };
    },
    refetchInterval: 60000
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown size={20} />
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {funnelData?.stages.map((stage, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{stage.name}</span>
              <div className="text-right">
                <span className="text-lg font-bold">{stage.count.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-2">({stage.percent}%)</span>
              </div>
            </div>
            <Progress value={parseFloat(stage.percent)} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}