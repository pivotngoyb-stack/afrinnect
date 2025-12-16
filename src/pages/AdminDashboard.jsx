import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Send } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminOverview from '@/components/admin/AdminOverview';
import UserManagement from '@/components/admin/UserManagement';
import ModerationCenter from '@/components/admin/ModerationCenter';
import RevenueAnalytics from '@/components/admin/RevenueAnalytics';
import AuditLogs from '@/components/admin/AuditLogs';
import VerificationQueue from '@/components/admin/VerificationQueue';
import ModerationRules from '@/components/admin/ModerationRules';
import EventManagement from '@/components/admin/EventManagement';
import SupportTickets from '@/components/admin/SupportTickets';
import BroadcastMessages from '@/components/admin/BroadcastMessages';
import FeatureFlags from '@/components/admin/FeatureFlags';
import PricingManagement from '@/components/admin/PricingManagement';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => base44.entities.AdminAuditLog.list('-created_date', 500),
    enabled: isAdmin
  });

  // Fetch verification requests
  const { data: verificationRequests = [] } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: () => base44.entities.VerificationRequest.filter({ status: 'pending' }, '-created_date', 100),
    enabled: isAdmin
  });

  // Fetch moderation rules
  const { data: moderationRules = [] } = useQuery({
    queryKey: ['admin-moderation-rules'],
    queryFn: () => base44.entities.ModerationRule.list('-created_date', 200),
    enabled: isAdmin
  });

  // Fetch support tickets
  const { data: supportTickets = [] } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: () => base44.entities.SupportTicket.filter({ status: { $in: ['open', 'in_progress'] } }, '-created_date', 200),
    enabled: isAdmin
  });

  // Fetch broadcast messages
  const { data: broadcastMessages = [] } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: () => base44.entities.BroadcastMessage.list('-created_date', 100),
    enabled: isAdmin
  });

  // Fetch feature flags
  const { data: featureFlags = [] } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => base44.entities.FeatureFlag.list('-created_date', 100),
    enabled: isAdmin
  });

  // Fetch pricing plans
  const { data: pricingPlans = [] } = useQuery({
    queryKey: ['admin-pricing-plans'],
    queryFn: () => base44.entities.PricingPlan.list('-created_date', 50),
    enabled: isAdmin
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const userProfiles = await base44.entities.UserProfile.filter({ user_id: userId });
      for (const profile of userProfiles) {
        await base44.entities.UserProfile.delete(profile.id);
      }
      
      // Log action
      await base44.entities.AdminAuditLog.create({
        admin_user_id: currentUser.id,
        admin_email: currentUser.email,
        action_type: 'user_delete',
        target_user_id: userId,
        details: { profiles: userProfiles.map(p => p.id) }
      });
      
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-profiles']);
      queryClient.invalidateQueries(['admin-audit-logs']);
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
      
      // Log action
      await base44.entities.AdminAuditLog.create({
        admin_user_id: currentUser.id,
        admin_email: currentUser.email,
        action_type: 'user_ban',
        target_user_id: userId,
        details: { profiles: userProfiles.map(p => p.id) }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-profiles']);
      queryClient.invalidateQueries(['admin-audit-logs']);
      setActionDialog({ open: false, type: null, user: null });
    }
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action, notes }) => {
      await base44.entities.Report.update(reportId, {
        status: 'resolved',
        action_taken: action,
        moderator_notes: notes || '',
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
    conversionRate: profiles.length > 0 ? ((premiumUsersCount / profiles.length) * 100).toFixed(1) : 0,
    auditLogs: auditLogs.length
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

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <AdminOverview stats={stats} />;
      case 'users':
        return (
          <UserManagement
            profiles={profiles}
            users={users}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onViewUser={(id) => window.open(createPageUrl(`Profile?id=${id}`), '_blank')}
            onBanUser={(user) => setActionDialog({ open: true, type: 'ban', user })}
            onDeleteUser={(user) => setActionDialog({ open: true, type: 'delete', user })}
            onMessageUser={(profile) => setMessageDialog({ open: true, type: 'single', profile })}
            onToggleAdmin={(userId, grantAdmin) => toggleAdminMutation.mutate({ userId, grantAdmin })}
          />
        );
      case 'moderation':
        return <ModerationCenter reports={reports} onResolveReport={resolveReportMutation.mutate} />;
      case 'revenue':
        return <RevenueAnalytics subscriptions={subscriptions} profiles={profiles} />;
      case 'verification':
        return <VerificationQueue requests={verificationRequests} profiles={profiles} currentUser={currentUser} />;
      case 'analytics':
        return (
          <div className="space-y-6">
            <ModerationRules rules={moderationRules} currentUser={currentUser} />
            <FeatureFlags flags={featureFlags} />
          </div>
        );
      case 'events':
        return <EventManagement events={events} />;
      case 'messaging':
        return <BroadcastMessages broadcasts={broadcastMessages} profiles={profiles} currentUser={currentUser} />;
      case 'support':
        return <SupportTickets tickets={supportTickets} currentUser={currentUser} />;
      case 'compliance':
        return <PricingManagement plans={pricingPlans} />;
      case 'settings':
        return <AuditLogs logs={auditLogs} />;
      default:
        return <AdminOverview stats={stats} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">{/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        stats={stats}
        onLogout={() => base44.auth.logout(createPageUrl('Landing'))}
        userEmail={currentUser?.email}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Content */}
        {renderView()}
      </div>
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