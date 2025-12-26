import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RevenueWidget() {
  const { data: stats } = useQuery({
    queryKey: ['revenue-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Total revenue
      const receipts = await base44.entities.Receipt.filter({
        purchase_date: { $gte: thirtyDaysAgo }
      });
      
      const totalRevenue = receipts.reduce((sum, r) => sum + r.amount_paid, 0);
      
      // Active subscriptions
      const activeSubs = await base44.entities.Subscription.filter({
        status: 'active'
      });
      
      // Monthly recurring revenue
      const monthlyRevenue = activeSubs
        .filter(s => s.plan_type.includes('monthly'))
        .reduce((sum, s) => sum + s.amount_paid, 0);
      
      // Conversion rate
      const totalProfiles = await base44.entities.UserProfile.filter({ is_active: true });
      const conversionRate = totalProfiles.length > 0 
        ? ((activeSubs.length / totalProfiles.length) * 100).toFixed(1)
        : 0;

      // Average revenue per user
      const arpu = activeSubs.length > 0 ? (totalRevenue / activeSubs.length).toFixed(2) : 0;

      return {
        totalRevenue,
        monthlyRecurring: monthlyRevenue,
        activeSubscribers: activeSubs.length,
        conversionRate,
        arpu
      };
    },
    refetchInterval: 60000
  });

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            Total Revenue (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">
            ${stats?.totalRevenue?.toLocaleString() || 0}
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            MRR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">
            ${stats?.monthlyRecurring?.toLocaleString() || 0}
          </p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Users size={16} className="text-purple-600" />
            Active Subscribers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.activeSubscribers || 0}
          </p>
          <Badge className="mt-2 bg-purple-600">
            {stats?.conversionRate || 0}% conversion
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            ARPU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-amber-600">
            ${stats?.arpu || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Average per user</p>
        </CardContent>
      </Card>
    </div>
  );
}