import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  DollarSign, TrendingUp, Users, CreditCard, RefreshCw, 
  Calendar, ArrowUp, ArrowDown, Crown, Star, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
      setUser(currentUser);
      await loadSubscriptions();
    } catch (error) {
      navigate(createPageUrl('Home'));
    }
  };

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const [subs, allProfiles] = await Promise.all([
        base44.entities.Subscription.list('-created_date', 500),
        base44.entities.UserProfile.list('-created_date', 1000)
      ]);

      setSubscriptions(subs);

      // Create profile lookup
      const profileMap = {};
      allProfiles.forEach(p => { profileMap[p.id] = p; });
      setProfiles(profileMap);

      // Calculate stats
      const now = new Date();
      const activeSubs = subs.filter(s => s.status === 'active');
      const monthlyRevenue = subs
        .filter(s => new Date(s.created_date) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, s) => sum + (s.amount_paid || 0), 0);

      // MRR calculation
      const mrr = activeSubs.reduce((sum, s) => {
        const amount = s.amount_paid || 0;
        if (s.plan_type.includes('yearly')) return sum + (amount / 12);
        if (s.plan_type.includes('quarterly')) return sum + (amount / 3);
        if (s.plan_type.includes('6months')) return sum + (amount / 6);
        return sum + amount;
      }, 0);

      // Churn (cancelled in last 30 days / total at start of period)
      const cancelledThisMonth = subs.filter(s => {
        if (s.status !== 'cancelled') return false;
        return new Date(s.updated_date) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }).length;

      // Distribution by plan
      const planDist = {};
      activeSubs.forEach(s => {
        planDist[s.plan_type] = (planDist[s.plan_type] || 0) + 1;
      });

      // Revenue by plan
      const revenueDist = {};
      activeSubs.forEach(s => {
        const tier = s.plan_type.split('_')[0];
        revenueDist[tier] = (revenueDist[tier] || 0) + (s.amount_paid || 0);
      });

      setStats({
        totalRevenue: subs.reduce((sum, s) => sum + (s.amount_paid || 0), 0),
        monthlyRevenue,
        mrr,
        activeSubs: activeSubs.length,
        churnRate: activeSubs.length > 0 ? ((cancelledThisMonth / (activeSubs.length + cancelledThisMonth)) * 100).toFixed(1) : 0,
        avgRevPerUser: activeSubs.length > 0 ? (mrr / activeSubs.length).toFixed(2) : 0,
        planDistribution: Object.entries(planDist).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
        revenueDistribution: Object.entries(revenueDist).map(([name, value]) => ({ name, value }))
      });

    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
    setLoading(false);
  };

  const COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981'];

  const getPlanBadgeColor = (plan) => {
    if (plan.includes('vip')) return 'bg-purple-500';
    if (plan.includes('elite')) return 'bg-orange-500';
    if (plan.includes('premium')) return 'bg-blue-500';
    return 'bg-slate-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar activePage="AdminSubscriptions" />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Subscriptions & Revenue</h1>
              <p className="text-sm text-slate-400">{stats?.activeSubs} active subscriptions</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-slate-700 text-slate-300">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              <Button onClick={loadSubscriptions} className="bg-orange-500 hover:bg-orange-600">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Revenue Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">${stats?.totalRevenue?.toLocaleString()}</p>
                    <p className="text-slate-400 text-xs">All time</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">MRR</p>
                    <p className="text-2xl font-bold text-white">${stats?.mrr?.toLocaleString()}</p>
                    <p className="text-green-400 text-xs">Monthly recurring</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Active Subs</p>
                    <p className="text-2xl font-bold text-white">{stats?.activeSubs}</p>
                    <p className="text-orange-400 text-xs">${stats?.avgRevPerUser} ARPU</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Churn Rate</p>
                    <p className="text-2xl font-bold text-white">{stats?.churnRate}%</p>
                    <p className="text-red-400 text-xs">Last 30 days</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <ArrowDown className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats?.planDistribution || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(stats?.planDistribution || []).map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Tier */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Revenue by Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats?.revenueDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      formatter={(value) => [`$${value}`, 'Revenue']}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Subscriptions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-3 text-slate-400 font-medium">User</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Plan</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Amount</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Started</th>
                      <th className="text-left p-3 text-slate-400 font-medium">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.slice(0, 20).map((sub) => {
                      const profile = profiles[sub.user_profile_id];
                      return (
                        <tr key={sub.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={profile?.primary_photo} />
                                <AvatarFallback className="bg-slate-700 text-white text-sm">
                                  {profile?.display_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white">{profile?.display_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={getPlanBadgeColor(sub.plan_type)}>
                              {sub.plan_type.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              sub.status === 'active' ? 'bg-green-500' :
                              sub.status === 'cancelled' ? 'bg-red-500' :
                              'bg-slate-500'
                            }>
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-white">
                            ${sub.amount_paid?.toFixed(2) || '0.00'} {sub.currency}
                          </td>
                          <td className="p-3 text-slate-400">
                            {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-3 text-slate-400">
                            {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}