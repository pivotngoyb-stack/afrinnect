import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ChurnAnalysis() {
  const { data: churnData } = useQuery({
    queryKey: ['churn-analysis'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Cancelled subscriptions
      const cancelledSubs = await base44.entities.Subscription.filter({
        status: 'cancelled',
        end_date: { $gte: thirtyDaysAgo }
      });

      // Inactive users (no activity in 7 days)
      const inactiveUsers = await base44.entities.UserProfile.filter({
        last_active: { $lt: sevenDaysAgo },
        is_active: true
      });

      // Users at risk (low engagement)
      const allActiveUsers = await base44.entities.UserProfile.filter({
        is_active: true
      });

      const usersAtRisk = allActiveUsers.filter(u => {
        const lastActive = new Date(u.last_active);
        const daysSinceActive = Math.floor((Date.now() - lastActive) / (24 * 60 * 60 * 1000));
        return daysSinceActive >= 3 && daysSinceActive < 7;
      });

      // Churn reasons from cancellations
      const churnReasons = cancelledSubs.reduce((acc, sub) => {
        const reason = sub.cancellation_reason || 'Not specified';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

      const churnRate = allActiveUsers.length > 0 
        ? ((inactiveUsers.length / allActiveUsers.length) * 100).toFixed(1)
        : 0;

      return {
        cancelledCount: cancelledSubs.length,
        inactiveCount: inactiveUsers.length,
        atRiskCount: usersAtRisk.length,
        churnRate,
        churnReasons,
        usersAtRisk
      };
    },
    refetchInterval: 300000 // 5 minutes
  });

  return (
    <div className="space-y-6">
      {/* Alert for high churn */}
      {parseFloat(churnData?.churnRate || 0) > 20 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-red-600" />
              <div>
                <p className="font-semibold text-red-900">High churn rate detected</p>
                <p className="text-sm text-red-700">
                  {churnData.churnRate}% of users are inactive - immediate action needed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Churn Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{churnData?.churnRate || 0}%</p>
            <p className="text-sm text-gray-500 mt-1">{churnData?.inactiveCount || 0} inactive users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{churnData?.atRiskCount || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Users with low engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cancelled (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-700">{churnData?.cancelledCount || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Subscription cancellations</p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Reasons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown size={20} />
            Cancellation Reasons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(churnData?.churnReasons || {}).map(([reason, count]) => (
              <div key={reason}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{reason}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
                <Progress 
                  value={(count / (churnData?.cancelledCount || 1)) * 100} 
                  className="h-2" 
                />
              </div>
            ))}
            {Object.keys(churnData?.churnReasons || {}).length === 0 && (
              <p className="text-center text-gray-500 py-4">No cancellation data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} className="text-orange-500" />
            Users At Risk ({churnData?.atRiskCount || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {churnData?.usersAtRisk?.slice(0, 10).map(user => {
              const daysSinceActive = Math.floor(
                (Date.now() - new Date(user.last_active)) / (24 * 60 * 60 * 1000)
              );
              
              return (
                <div key={user.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-sm">{user.display_name}</p>
                    <p className="text-xs text-gray-600">
                      Last active {daysSinceActive} days ago
                    </p>
                  </div>
                  <Badge className="bg-orange-600">At Risk</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}