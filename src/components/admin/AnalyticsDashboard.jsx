import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, TrendingUp, Users, Heart, DollarSign, Activity, MessageSquare } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [metricType, setMetricType] = useState('engagement');

  const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const { data: analytics = [] } = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: async () => {
      const days = Array.from({ length: daysCount }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      const data = await Promise.all(
        last30Days.map(async (date) => {
          const dayAnalytics = await base44.entities.ProfileAnalytics.filter({ date });
          return {
            date,
            totalViews: dayAnalytics.reduce((sum, a) => sum + (a.views_count || 0), 0),
            totalLikes: dayAnalytics.reduce((sum, a) => sum + (a.likes_received || 0), 0),
            totalMatches: dayAnalytics.reduce((sum, a) => sum + (a.matches_count || 0), 0),
            avgResponseRate: dayAnalytics.length > 0 
              ? dayAnalytics.reduce((sum, a) => sum + (a.response_rate || 0), 0) / dayAnalytics.length 
              : 0
          };
        })
      );

      return data.reverse();
    }
  });

  const totals = analytics.reduce(
    (acc, day) => ({
      views: acc.views + day.totalViews,
      likes: acc.likes + day.totalLikes,
      matches: acc.matches + day.totalMatches
    }),
    { views: 0, likes: 0, matches: 0 }
  );

  // Real-time stats
  const { data: realtimeStats } = useQuery({
    queryKey: ['realtime-stats'],
    queryFn: async () => {
      const now = new Date();
      const hourAgo = new Date(now - 60 * 60 * 1000);
      
      const activeUsers = await base44.entities.UserProfile.filter({
        last_active: { $gte: hourAgo.toISOString() }
      });

      const recentMessages = await base44.entities.Message.filter({
        created_date: { $gte: hourAgo.toISOString() }
      });

      return {
        activeNow: activeUsers.length,
        messagesLastHour: recentMessages.length
      };
    },
    refetchInterval: 30000 // Update every 30 seconds
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metricType} onValueChange={setMetricType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Now</p>
                <p className="text-3xl font-bold">{realtimeStats?.activeNow || 0}</p>
              </div>
              <Activity className="text-green-600 animate-pulse" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages (Last Hour)</p>
                <p className="text-3xl font-bold">{realtimeStats?.messagesLastHour || 0}</p>
              </div>
              <MessageSquare className="text-blue-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={18} className="text-blue-600" />
              Total Profile Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.views.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart size={18} className="text-pink-600" />
              Total Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.likes.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp size={18} className="text-green-600" />
              Total Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.matches.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart size={20} />
            Engagement Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.slice(-7).map((day, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <div className="flex gap-4">
                  <span className="text-blue-600">{day.totalViews} views</span>
                  <span className="text-pink-600">{day.totalLikes} likes</span>
                  <span className="text-green-600">{day.totalMatches} matches</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}