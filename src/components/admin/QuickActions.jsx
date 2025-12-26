import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Mail, Users, Shield, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickActions() {
  const queryClient = useQueryClient();

  const actionMutations = {
    sendWinback: useMutation({
      mutationFn: () => base44.functions.invoke('sendWinbackEmail', {}),
      onSuccess: (data) => {
        toast.success(`Sent ${data.data.emailsSent} win-back emails`);
      }
    }),

    verifyPhotos: useMutation({
      mutationFn: () => base44.functions.invoke('autoVerifyPhotos', {}),
      onSuccess: (data) => {
        toast.success(`Processed ${data.data.processed} verifications`);
        queryClient.invalidateQueries(['admin-verifications']);
      }
    }),

    analyzePatterns: useMutation({
      mutationFn: () => base44.functions.invoke('analyzeConversationPatterns', {}),
      onSuccess: (data) => {
        toast.success(`Analyzed ${data.data.analyzed} conversations`);
      }
    }),

    checkExpired: useMutation({
      mutationFn: () => base44.functions.invoke('checkExpiredSubscriptions', {}),
      onSuccess: (data) => {
        toast.success(`Checked ${data.data.checked} subscriptions`);
        queryClient.invalidateQueries(['admin-subscriptions']);
      }
    })
  };

  const actions = [
    {
      label: 'Send Win-back Emails',
      description: 'Re-engage inactive users',
      icon: Mail,
      color: 'blue',
      mutation: actionMutations.sendWinback
    },
    {
      label: 'Auto-Verify Photos',
      description: 'Process pending verifications',
      icon: Shield,
      color: 'green',
      mutation: actionMutations.verifyPhotos
    },
    {
      label: 'Analyze Patterns',
      description: 'Detect conversation issues',
      icon: TrendingUp,
      color: 'purple',
      mutation: actionMutations.analyzePatterns
    },
    {
      label: 'Check Expired Subs',
      description: 'Update subscription statuses',
      icon: Users,
      color: 'amber',
      mutation: actionMutations.checkExpired
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap size={20} className="text-purple-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-3">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Button
                key={idx}
                onClick={() => action.mutation.mutate()}
                disabled={action.mutation.isPending}
                variant="outline"
                className="h-auto p-4 justify-start"
              >
                <Icon size={20} className={`text-${action.color}-600 mr-3`} />
                <div className="text-left">
                  <p className="font-semibold text-sm">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}