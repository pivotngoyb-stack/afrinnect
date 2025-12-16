import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Users, AlertTriangle, DollarSign, Eye, Shield, Crown, Ban, Trash2,
  CheckCircle, XCircle, Search, Filter, BarChart3, MessageCircle, LogOut, Send, UserCog, Heart, TrendingUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AfricanPattern from '@/components/shared/AfricanPattern';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null, user: null });
  const [messageDialog, setMessageDialog] = useState({ open: false, type: 'single', profile: null });
  const [messageText, setMessageText] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Allow super admin email or users with admin role
        const isSuperAdmin = user?.email === 'pivotngoyb@gmail.com' || user?.role === 'admin';
        setIsAdmin(isSuperAdmin);
        if (!isSuperAdmin) {
          window.location.href = createPageUrl('Landing');
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    checkAdmin();
  }, []);

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    enabled: isAdmin
  });

  // Fetch all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 1000),
    enabled: isAdmin
  });

  // Fetch all reports
  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => base44.entities.Report.filter({ status: { $in: ['pending', 'under_review'] } }, '-created_date', 100),
    enabled: isAdmin
  });

  // Fetch all subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' }, '-created_date', 200),
    enabled: isAdmin
  });

  // Fetch all safety checks
  const { data: safetyChecks = [] } = useQuery({
    queryKey: ['admin-safety-checks'],
    queryFn: () => base44.entities.SafetyCheck.filter({ status: { $in: ['active', 'alert_triggered'] } }, '-created_date', 50),
    enabled: isAdmin
  });

  // Fetch deleted accounts
  const { data: deletedAccounts = [] } = useQuery({
    queryKey: ['admin-deleted'],
    queryFn: () => base44.entities.DeletedAccount.list('-deleted_at', 100),
    enabled: isAdmin
  });

  // Fetch matches for analytics
  const { data: matches = [] } = useQuery({
    queryKey: ['admin-matches'],
    queryFn: () => base44.entities.Match.filter({ is_match: true }, '-matched_at', 500),
    enabled: isAdmin
  });

  // Fetch all events
  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => base44.entities.Event.list('-created_date', 100),
    enabled: isAdmin
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      // Delete user profile first
      const userProfiles = await base44.entities.UserProfile.filter({ user_id: userId });
      for (const profile of userProfiles) {
        await base44.entities.UserProfile.delete(profile.id);
      }
      // Note: User entity deletion might need backend support
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-profiles']);
      setActionDialog({ open: false, type: null, user: null });
    }
  });

  // Ban/suspend user mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId) => {
      const userProfiles = await base44.entities.UserProfile.filter({ user_id: userId });
      for (const profile of userProfiles) {
        await base44.entities.UserProfile.update(profile.id, { is_active: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-profiles']);
      setActionDialog({ open: false, type: null, user: null });
    }
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action }) => {
      await base44.entities.Report.update(reportId, {
        status: 'resolved',
        action_taken: action,
        resolved_by: currentUser.email,
        resolved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-reports']);
    }
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subId) => {
      await base44.entities.Subscription.update(subId, {
        status: 'cancelled',
        auto_renew: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-subscriptions']);
    }
  });

  // Grant/revoke admin access mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, grantAdmin }) => {
      // Note: This requires backend support to update User.role
      // For now, we'll show the UI but actual implementation needs backend
      await base44.entities.User.update(userId, {
        role: grantAdmin ? 'admin' : 'user'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ profileIds, message }) => {
      const notifications = profileIds.map(profileId => ({
        user_profile_id: profileId,
        type: 'admin_message',
        title: 'Message from Admin',
        message: message,
        is_admin: true
      }));
      
      for (const notif of notifications) {
        await base44.entities.Notification.create(notif);
      }
    },
    onSuccess: () => {
      setMessageDialog({ open: false, type: 'single', profile: null });
      setMessageText('');
      alert('Message sent successfully!');
    }
  });

  // Stats
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const newUsersThisWeek = profiles.filter(p => new Date(p.created_date) > lastWeek).length;
  const newUsersThisMonth = profiles.filter(p => new Date(p.created_date) > lastMonth).length;
  const matchesThisMonth = matches.filter(m => new Date(m.matched_at) > lastMonth).length;
  const revenueThisMonth = subscriptions.filter(s => new Date(s.start_date) > lastMonth).reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);

  const premiumUsersCount = profiles.filter(p => p.is_premium).length;
  const activeUsersCount = profiles.filter(p => p.is_active).length;
  const bannedUsersCount = profiles.filter(p => !p.is_active).length;

  const stats = {
    totalUsers: users.length,
    totalProfiles: profiles.length,
    premiumUsers: premiumUsersCount,
    verifiedUsers: profiles.filter(p => p.verification_status?.photo_verified).length,
    pendingReports: reports.length,
    activeSubscriptions: subscriptions.length,
    totalRevenue: subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0),
    activeSafetyChecks: safetyChecks.length,
    totalMatches: matches.length,
    newUsersThisWeek,
    newUsersThisMonth,
    matchesThisMonth,
    revenueThisMonth,
    totalEvents: events.length,
    activeUsers: activeUsersCount,
    bannedUsers: bannedUsersCount,
    conversionRate: profiles.length > 0 ? ((premiumUsersCount / profiles.length) * 100).toFixed(1) : 0
  };

  const filteredProfiles = profiles.filter(p => 
    p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 relative">
      <AfricanPattern className="text-white" opacity={0.05} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={28} className="text-amber-500" />
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <Badge className="bg-red-600">Super Admin</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white text-sm">
                {currentUser?.email}
              </div>
              <Link to={createPageUrl('CustomerView')}>
                <Button variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Eye size={18} />
                  Customer View
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => base44.auth.logout(createPageUrl('Landing'))}
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur border-blue-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users size={20} className="text-blue-400" />
                <Badge className="bg-blue-500 text-xs">+{stats.newUsersThisWeek} this week</Badge>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalProfiles}</p>
              <p className="text-sm text-gray-300">Total Profiles</p>
              <p className="text-xs text-gray-400 mt-1">{stats.activeUsers} active • {stats.bannedUsers} banned</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 backdrop-blur border-amber-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Crown size={20} className="text-amber-400" />
                <Badge className="bg-amber-500 text-xs">{stats.conversionRate}%</Badge>
              </div>
              <p className="text-3xl font-bold text-white">{stats.premiumUsers}</p>
              <p className="text-sm text-gray-300">Premium Users</p>
              <p className="text-xs text-gray-400 mt-1">{stats.activeSubscriptions} active subs</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur border-green-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign size={20} className="text-green-400" />
                <Badge className="bg-green-500 text-xs">${stats.revenueThisMonth.toFixed(0)} MTD</Badge>
              </div>
              <p className="text-3xl font-bold text-white">${stats.totalRevenue.toFixed(0)}</p>
              <p className="text-sm text-gray-300">Total Revenue</p>
              <p className="text-xs text-gray-400 mt-1">All-time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 backdrop-blur border-pink-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Heart size={20} className="text-pink-400" />
                <Badge className="bg-pink-500 text-xs">+{stats.matchesThisMonth} MTD</Badge>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalMatches}</p>
              <p className="text-sm text-gray-300">Total Matches</p>
              <p className="text-xs text-gray-400 mt-1">Successful connections</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur border-red-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle size={20} className="text-red-400" />
                {stats.pendingReports > 0 && <Badge className="bg-red-500 text-xs animate-pulse">Action Needed</Badge>}
              </div>
              <p className="text-3xl font-bold text-white">{stats.pendingReports}</p>
              <p className="text-sm text-gray-300">Pending Reports</p>
              <p className="text-xs text-gray-400 mt-1">{stats.activeSafetyChecks} safety checks</p>
            </CardContent>
          </Card>
        </div>

        {/* Growth Metrics */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">New Users This Month</p>
                  <p className="text-2xl font-bold text-white">{stats.newUsersThisMonth}</p>
                </div>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(stats.newUsersThisMonth / stats.totalProfiles) * 100}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Verified Users</p>
                  <p className="text-2xl font-bold text-white">{stats.verifiedUsers}</p>
                </div>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${(stats.verifiedUsers / stats.totalProfiles) * 100}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BarChart3 size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Events</p>
                  <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
                </div>
              </div>
              <Link to={createPageUrl('Events')}>
                <Button size="sm" variant="outline" className="w-full mt-2 border-purple-500 text-purple-400 hover:bg-purple-500/20">
                  Manage Events
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-white/10 backdrop-blur border-white/20 grid grid-cols-7 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({stats.totalProfiles})</TabsTrigger>
            <TabsTrigger value="reports">
              Reports {stats.pendingReports > 0 && <Badge className="ml-1 bg-red-500">{stats.pendingReports}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">Revenue</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="deleted">Deleted</TabsTrigger>
            <TabsTrigger value="messaging">Broadcast</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-400" />
                    Platform Growth
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Users</span>
                    <span className="text-2xl font-bold text-white">{stats.totalProfiles}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">New This Week</span>
                    <span className="text-xl font-bold text-blue-400">+{stats.newUsersThisWeek}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">New This Month</span>
                    <span className="text-xl font-bold text-blue-400">+{stats.newUsersThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Active Users</span>
                    <span className="text-xl font-bold text-green-400">{stats.activeUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Heart size={20} className="text-pink-400" />
                    Match Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Matches</span>
                    <span className="text-2xl font-bold text-white">{stats.totalMatches}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Matches This Month</span>
                    <span className="text-xl font-bold text-pink-400">+{stats.matchesThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Match Success Rate</span>
                    <span className="text-xl font-bold text-green-400">
                      {stats.totalProfiles > 0 ? ((stats.totalMatches / stats.totalProfiles) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Verified Users</span>
                    <span className="text-xl font-bold text-green-400">{stats.verifiedUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign size={20} className="text-green-400" />
                    Revenue Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Revenue</span>
                    <span className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">This Month</span>
                    <span className="text-xl font-bold text-green-400">${stats.revenueThisMonth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Conversion Rate</span>
                    <span className="text-xl font-bold text-amber-400">{stats.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Active Subscriptions</span>
                    <span className="text-xl font-bold text-green-400">{stats.activeSubscriptions}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield size={20} className="text-blue-400" />
                    Safety & Moderation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Reports</span>
                    <span className={`text-2xl font-bold ${stats.pendingReports > 0 ? 'text-red-400' : 'text-white'}`}>
                      {stats.pendingReports}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Active Safety Checks</span>
                    <span className="text-xl font-bold text-yellow-400">{stats.activeSafetyChecks}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Banned Users</span>
                    <span className="text-xl font-bold text-red-400">{stats.bannedUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Deleted Accounts</span>
                    <span className="text-xl font-bold text-gray-400">{deletedAccounts.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => setMessageDialog({ open: true, type: 'all', profile: null })}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Send size={18} className="mr-2" />
                    Broadcast Message
                  </Button>
                  <Link to={createPageUrl('CustomerView')}>
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      <Eye size={18} className="mr-2" />
                      Preview App
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Events')}>
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      <BarChart3 size={18} className="mr-2" />
                      Manage Events
                    </Button>
                  </Link>
                  <Link to={createPageUrl('PricingPlans')}>
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      <Crown size={18} className="mr-2" />
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>User Management</span>
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredProfiles.map(profile => {
                    const user = users.find(u => u.id === profile.user_id);
                    const isUserAdmin = user?.role === 'admin' || user?.email === 'pivotngoyb@gmail.com';
                    
                    return (
                      <div key={profile.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition">
                        <div className="flex items-center gap-4">
                          <img
                            src={profile.primary_photo || profile.photos?.[0] || 'https://via.placeholder.com/50'}
                            alt={profile.display_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{profile.display_name}</p>
                              {profile.verification_status?.photo_verified && (
                                <CheckCircle size={16} className="text-green-400" />
                              )}
                              {profile.is_premium && (
                                <Crown size={16} className="text-amber-400" />
                              )}
                              {isUserAdmin && (
                                <Badge className="bg-red-600">Admin</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{user?.email}</p>
                            <p className="text-xs text-gray-500">
                              {profile.current_city}, {profile.current_country}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={profile.is_active ? 'bg-green-600' : 'bg-red-600'}>
                            {profile.is_active ? 'Active' : 'Banned'}
                          </Badge>
                          {user?.email !== 'pivotngoyb@gmail.com' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                              onClick={() => toggleAdminMutation.mutate({ userId: user.id, grantAdmin: !isUserAdmin })}
                            >
                              <Shield size={16} className="mr-1" />
                              {isUserAdmin ? 'Revoke' : 'Grant'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                            onClick={() => setMessageDialog({ open: true, type: 'single', profile })}
                          >
                            <Send size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500 text-amber-400 hover:bg-amber-500/20"
                            onClick={() => window.open(`/Profile?id=${profile.id}`, '_blank')}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/20"
                            onClick={() => setActionDialog({ open: true, type: 'ban', user: profile })}
                            disabled={user?.email === 'pivotngoyb@gmail.com'}
                          >
                            <Ban size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-500 hover:bg-red-600/20"
                            onClick={() => setActionDialog({ open: true, type: 'delete', user: profile })}
                            disabled={user?.email === 'pivotngoyb@gmail.com'}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Report Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {reports.map(report => (
                    <div key={report.id} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge className="bg-red-600 mb-2">{report.report_type.replace('_', ' ')}</Badge>
                          <p className="text-white font-medium">Reported User: {report.reported_id}</p>
                          <p className="text-gray-400 text-sm">By: {report.reporter_id}</p>
                        </div>
                        <Badge className={report.status === 'pending' ? 'bg-yellow-600' : 'bg-blue-600'}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{report.description}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => resolveReportMutation.mutate({ reportId: report.id, action: 'warning' })}
                        >
                          Warn User
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => resolveReportMutation.mutate({ reportId: report.id, action: 'permanent_ban' })}
                        >
                          Ban User
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white"
                          onClick={() => resolveReportMutation.mutate({ reportId: report.id, action: 'none' })}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No pending reports</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Subscription Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-semibold text-white capitalize">
                          {sub.plan_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-400">User: {sub.user_profile_id}</p>
                        <p className="text-xs text-gray-500">
                          ${sub.amount_paid} {sub.currency} • {sub.payment_provider}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={sub.auto_renew ? 'bg-green-600' : 'bg-yellow-600'}>
                          {sub.auto_renew ? 'Auto-renew' : 'Manual'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400"
                          onClick={() => cancelSubscriptionMutation.mutate(sub.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deleted Accounts Tab */}
          <TabsContent value="deleted" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Deleted Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {deletedAccounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-semibold text-white">{account.display_name}</p>
                        <p className="text-sm text-gray-400">{account.user_email}</p>
                        <p className="text-xs text-gray-500">
                          Deleted: {new Date(account.deleted_at).toLocaleString()}
                        </p>
                        {account.deletion_reason && (
                          <p className="text-xs text-gray-500">Reason: {account.deletion_reason}</p>
                        )}
                      </div>
                      <Badge className="bg-red-600">Deleted</Badge>
                    </div>
                  ))}
                  {deletedAccounts.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No deleted accounts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messaging Tab */}
          <TabsContent value="messaging" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Broadcast Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => setMessageDialog({ open: true, type: 'all', profile: null })}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Send size={18} className="mr-2" />
                    Send Message to All Users
                  </Button>
                  
                  <div className="bg-white/5 rounded-lg p-6">
                    <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <p className="text-gray-300 text-sm">• Send announcements to all users</p>
                      <p className="text-gray-300 text-sm">• Direct message individual users from the Users tab</p>
                      <p className="text-gray-300 text-sm">• Messages appear in user notifications</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Active Safety Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {safetyChecks.map(check => (
                    <div key={check.id} className={`p-4 rounded-lg ${check.panic_triggered ? 'bg-red-500/20 border-2 border-red-500' : 'bg-white/5'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold">Safety Check</p>
                          <p className="text-sm text-gray-400">User: {check.user_profile_id}</p>
                          <p className="text-sm text-gray-400">Meeting: {check.meeting_with_profile_id}</p>
                        </div>
                        <Badge className={check.panic_triggered ? 'bg-red-600' : check.status === 'active' ? 'bg-yellow-600' : 'bg-green-600'}>
                          {check.panic_triggered ? 'PANIC!' : check.status}
                        </Badge>
                      </div>
                      {check.panic_triggered && (
                        <div className="mt-3 p-3 bg-red-600/30 rounded">
                          <p className="text-white font-bold mb-1">🚨 PANIC BUTTON TRIGGERED</p>
                          <p className="text-sm text-gray-200">Location: {check.date_location}</p>
                          <p className="text-sm text-gray-200">Emergency Contact: {check.emergency_contact_name} - {check.emergency_contact_phone}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {safetyChecks.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No active safety checks</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent className="bg-gray-900 border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {actionDialog.type === 'delete' ? 'Delete User' : 'Ban User'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to {actionDialog.type} {actionDialog.user?.display_name}? 
              {actionDialog.type === 'delete' && ' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (actionDialog.type === 'delete') {
                  deleteUserMutation.mutate(actionDialog.user?.user_id);
                } else {
                  banUserMutation.mutate(actionDialog.user?.user_id);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message Dialog */}
      <AlertDialog open={messageDialog.open} onOpenChange={(open) => setMessageDialog({ ...messageDialog, open })}>
        <AlertDialogContent className="bg-gray-900 border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {messageDialog.type === 'all' ? 'Send Message to All Users' : `Message ${messageDialog.profile?.display_name}`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {messageDialog.type === 'all' 
                ? 'This message will be sent to all active users on the platform.'
                : 'Send a direct message to this user.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="w-full h-32 bg-white/10 text-white border border-white/20 rounded-lg p-3 resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!messageText.trim()}
              onClick={() => {
                if (messageDialog.type === 'all') {
                  const allProfileIds = profiles.filter(p => p.is_active).map(p => p.id);
                  sendMessageMutation.mutate({ profileIds: allProfileIds, message: messageText });
                } else {
                  sendMessageMutation.mutate({ profileIds: [messageDialog.profile.id], message: messageText });
                }
              }}
            >
              <Send size={16} className="mr-2" />
              Send Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}