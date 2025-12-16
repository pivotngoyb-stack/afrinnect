import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, DollarSign, Heart, AlertTriangle, TrendingUp, CheckCircle, Globe } from 'lucide-react';

export default function AdminOverview({ stats }) {
  const kpiCards = [
    {
      title: 'Total Users',
      value: stats.totalProfiles,
      change: `+${stats.newUsersThisWeek} this week`,
      icon: Users,
      color: 'blue',
      subtext: `${stats.activeUsers} active`
    },
    {
      title: 'Premium Users',
      value: stats.premiumUsers,
      change: `${stats.conversionRate}% conversion`,
      icon: Crown,
      color: 'amber',
      subtext: `${stats.activeSubscriptions} subscriptions`
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(0)}`,
      change: `$${stats.revenueThisMonth.toFixed(0)} MTD`,
      icon: DollarSign,
      color: 'green',
      subtext: 'Lifetime earnings'
    },
    {
      title: 'Total Matches',
      value: stats.totalMatches,
      change: `+${stats.matchesThisMonth} this month`,
      icon: Heart,
      color: 'pink',
      subtext: 'Successful connections'
    }
  ];

  const healthMetrics = [
    { label: 'Active Users', value: stats.activeUsers, total: stats.totalProfiles, status: 'good' },
    { label: 'Verified Users', value: stats.verifiedUsers, total: stats.totalProfiles, status: 'good' },
    { label: 'Pending Reports', value: stats.pendingReports, total: stats.totalProfiles, status: stats.pendingReports > 10 ? 'warning' : 'good' },
    { label: 'Banned Users', value: stats.bannedUsers, total: stats.totalProfiles, status: stats.bannedUsers > 100 ? 'warning' : 'good' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className={`bg-gradient-to-br from-${kpi.color}-500/10 to-${kpi.color}-600/5 border-${kpi.color}-500/20`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-${kpi.color}-500/20`}>
                    <Icon size={24} className={`text-${kpi.color}-500`} />
                  </div>
                  <Badge className={`bg-${kpi.color}-500/20 text-${kpi.color}-700`}>
                    {kpi.change}
                  </Badge>
                </div>
                <h3 className="text-3xl font-bold mb-1">{kpi.value}</h3>
                <p className="text-sm text-gray-600">{kpi.title}</p>
                <p className="text-xs text-gray-500 mt-2">{kpi.subtext}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Growth Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-green-500" />
              Platform Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New This Week</span>
                <span className="text-xl font-bold text-blue-600">+{stats.newUsersThisWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New This Month</span>
                <span className="text-xl font-bold text-blue-600">+{stats.newUsersThisMonth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Growth Rate</span>
                <span className="text-xl font-bold text-green-600">
                  {stats.totalProfiles > 0 ? ((stats.newUsersThisMonth / stats.totalProfiles) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-blue-500" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthMetrics.map((metric, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <span className="text-sm font-semibold">
                    {metric.value} / {metric.total}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${(metric.value / metric.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} className="text-green-500" />
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-2xl font-bold text-green-600">${stats.revenueThisMonth.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">ARPU</p>
              <p className="text-2xl font-bold">
                ${stats.totalProfiles > 0 ? (stats.totalRevenue / stats.totalProfiles).toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-amber-600">{stats.conversionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}