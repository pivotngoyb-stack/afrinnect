import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConversionFunnel from './ConversionFunnel';
import { Badge } from "@/components/ui/badge";
import { Users, Crown, DollarSign, Heart, AlertTriangle, TrendingUp, CheckCircle, Globe } from 'lucide-react';

export default function AdminOverview({ stats }) {
  const kpiCards = [
    {
      title: 'Total Users',
      value: stats.totalProfiles || 0,
      change: `+${stats.newUsersThisWeek || 0} this week`,
      icon: Users,
      color: 'blue',
      subtext: `${stats.activeUsers || 0} active • ${stats.bannedUsers || 0} banned`
    },
    {
      title: 'Paid Subscribers',
      value: stats.totalPaidUsers || 0,
      change: `${stats.conversionRate}% conversion`,
      icon: Crown,
      color: 'amber',
      subtext: `Premium: ${stats.premiumUsers || 0} • Elite: ${stats.eliteUsers || 0} • VIP: ${stats.vipUsers || 0}`
    },
    {
      title: 'Total Revenue',
      value: `$${(stats.totalRevenue || 0).toFixed(0)}`,
      change: `$${(stats.revenueThisMonth || 0).toFixed(0)} MTD`,
      icon: DollarSign,
      color: 'green',
      subtext: `${stats.activeSubscriptions || 0} active subscriptions`
    },
    {
      title: 'Total Matches',
      value: stats.totalMatches || 0,
      change: `+${stats.matchesThisMonth || 0} this month`,
      icon: Heart,
      color: 'pink',
      subtext: `${stats.matchRate}% match rate • ${stats.usersWithMatches || 0} users matched`
    }
  ];

  const healthMetrics = [
    { label: 'Active Users', value: stats.activeUsers || 0, total: stats.totalProfiles || 1, status: 'good' },
    { label: 'Verified Users', value: stats.verifiedUsers || 0, total: stats.totalProfiles || 1, status: 'good' },
    { label: 'Pending Reports', value: stats.pendingReports || 0, total: Math.max(stats.totalReports || 10, 10), status: (stats.pendingReports || 0) > 10 ? 'warning' : 'good' },
    { label: 'Open Support Tickets', value: stats.openTickets || 0, total: Math.max(stats.totalTickets || 10, 10), status: (stats.urgentTickets || 0) > 5 ? 'warning' : 'good' }
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
                <span className="text-xl font-bold text-blue-600">+{stats.newUsersThisWeek || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New This Month</span>
                <span className="text-xl font-bold text-blue-600">+{stats.newUsersThisMonth || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Growth Rate</span>
                <span className="text-xl font-bold text-green-600">{stats.growthRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Matches This Week</span>
                <span className="text-xl font-bold text-pink-600">+{stats.matchesThisWeek || 0}</span>
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
              <p className="text-2xl font-bold">${(stats.totalRevenue || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-2xl font-bold text-green-600">${(stats.revenueThisMonth || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">ARPU</p>
              <p className="text-2xl font-bold">
                ${(stats.totalProfiles || 0) > 0 ? ((stats.totalRevenue || 0) / stats.totalProfiles).toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-amber-600">{stats.conversionRate || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}