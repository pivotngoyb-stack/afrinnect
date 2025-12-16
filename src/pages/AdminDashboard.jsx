import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, AlertTriangle, DollarSign, Eye, Shield, Crown, Ban, Trash2,
  CheckCircle, XCircle, Search, Filter, BarChart3, MessageCircle
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
import AfricanPattern from '@/components/shared/AfricanPattern';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null, user: null });
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
          window.location.href = '/';
        }
      } catch (e) {
        window.location.href = '/';
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

  // Stats
  const stats = {
    totalUsers: users.length,
    totalProfiles: profiles.length,
    premiumUsers: profiles.filter(p => p.is_premium).length,
    verifiedUsers: profiles.filter(p => p.verification_status?.photo_verified).length,
    pendingReports: reports.length,
    activeSubscriptions: subscriptions.length,
    totalRevenue: subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0),
    activeSafetyChecks: safetyChecks.length
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
            <div className="text-white text-sm">
              {currentUser?.email}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users size={20} className="text-blue-400" />
                <BarChart3 size={16} className="text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-sm text-gray-300">Total Users</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Crown size={20} className="text-amber-400" />
                <BarChart3 size={16} className="text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.premiumUsers}</p>
              <p className="text-sm text-gray-300">Premium Users</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle size={20} className="text-red-400" />
                <BarChart3 size={16} className="text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.pendingReports}</p>
              <p className="text-sm text-gray-300">Pending Reports</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign size={20} className="text-green-400" />
                <BarChart3 size={16} className="text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-300">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-white/10 backdrop-blur border-white/20">
            <TabsTrigger value="users">Users ({stats.totalProfiles})</TabsTrigger>
            <TabsTrigger value="reports">Reports ({stats.pendingReports})</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions ({stats.activeSubscriptions})</TabsTrigger>
            <TabsTrigger value="safety">Safety ({stats.activeSafetyChecks})</TabsTrigger>
          </TabsList>

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
    </div>
  );
}