import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, Calendar, Sparkles, ArrowRight, Gift, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';

export default function FoundingMemberStatus({ profile }) {
  if (!profile?.is_founding_member) return null;

  const trialEndsAt = profile.founding_member_trial_ends_at 
    ? new Date(profile.founding_member_trial_ends_at) 
    : null;
  const grantedAt = profile.founding_member_granted_at
    ? new Date(profile.founding_member_granted_at)
    : null;

  const now = new Date();
  const isTrialActive = trialEndsAt && trialEndsAt > now;
  const daysRemaining = trialEndsAt ? differenceInDays(trialEndsAt, now) : 0;
  const totalTrialDays = grantedAt && trialEndsAt 
    ? differenceInDays(trialEndsAt, grantedAt) 
    : 183;
  const progressPercent = totalTrialDays > 0 
    ? Math.max(0, Math.min(100, ((totalTrialDays - daysRemaining) / totalTrialDays) * 100))
    : 0;

  const benefits = [
    { icon: Sparkles, text: 'Unlimited likes' },
    { icon: Gift, text: 'See who likes you' },
    { icon: Crown, text: 'Advanced filters' },
    { icon: Calendar, text: 'Read receipts' }
  ];

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-4">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur">
            <Crown size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Founding Member</h3>
            <p className="text-sm text-white/90">Thank you for being an early supporter!</p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Trial Status */}
        {isTrialActive ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Premium Trial</span>
              <Badge className="bg-green-100 text-green-800">
                <Clock size={12} className="mr-1" />
                Active
              </Badge>
            </div>
            
            <Progress value={progressPercent} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {daysRemaining} days remaining
              </span>
              <span className="text-amber-600 font-medium">
                Expires {format(trialEndsAt, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <Clock size={18} />
              <span className="font-medium">Trial Ended</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Your founding member trial has expired. Subscribe to keep premium features.
            </p>
          </div>
        )}

        {/* Benefits */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Your Founding Benefits</h4>
          <div className="grid grid-cols-2 gap-2">
            {benefits.map((benefit, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2"
              >
                <benefit.icon size={16} className="text-amber-500" />
                <span className="text-sm text-gray-700">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Info */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          <p>
            Granted: {grantedAt ? format(grantedAt, 'MMM d, yyyy') : 'N/A'}
            {profile.founding_member_source && (
              <span className="ml-2">
                via {profile.founding_member_source === 'invite_code' 
                  ? `code ${profile.founding_member_code_used || ''}` 
                  : profile.founding_member_source.replace('_', ' ')}
              </span>
            )}
          </p>
        </div>

        {/* CTA */}
        {!isTrialActive && (
          <Link to={createPageUrl('PricingPlans')}>
            <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              Subscribe to Keep Premium
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        )}

        {isTrialActive && daysRemaining <= 14 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Heads up!</strong> Your trial ends soon. Subscribe now to ensure uninterrupted access to all premium features.
            </p>
            <Link to={createPageUrl('PricingPlans')}>
              <Button variant="outline" size="sm" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100">
                View Plans
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}