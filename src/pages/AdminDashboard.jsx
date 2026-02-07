import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Send, Rocket, Loader2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminOverview from '@/components/admin/AdminOverview';
import UserManagement from '@/components/admin/UserManagement';
import ModerationCenter from '@/components/admin/ModerationCenter';
import SafetyMonitorDashboard from '@/components/admin/SafetyMonitorDashboard';
import RevenueAnalytics from '@/components/admin/RevenueAnalytics';
import AuditLogs from '@/components/admin/AuditLogs';
import VerificationQueue from '@/components/admin/VerificationQueue';
import ModerationRules from '@/components/admin/ModerationRules';
import EventManagement from '@/components/admin/EventManagement';
import SupportTickets from '@/components/admin/SupportTickets';
import FakeProfileScanner from '@/components/admin/FakeProfileScanner';
import BroadcastMessages from '@/components/admin/BroadcastMessages';
import FeatureFlags from '@/components/admin/FeatureFlags';
import PricingManagement from '@/components/admin/PricingManagement';
import VideoProfileManagement from '@/components/admin/VideoProfileManagement';
import SuccessStoryModeration from '@/components/admin/SuccessStoryModeration';
import ContestManagement from '@/components/admin/ContestManagement';
import StoryManagement from '@/components/admin/StoryManagement';
import CommunityManagement from '@/components/admin/CommunityManagement';
import SubscriptionManagement from '@/components/admin/SubscriptionManagement';
import ReceiptsManagement from '@/components/admin/ReceiptsManagement';
import ChurnAnalysis from '@/components/admin/ChurnAnalysis';
import AIInsightsDashboard from '@/components/admin/AIInsightsDashboard';
import BackendOrchestrator from '@/components/admin/BackendOrchestrator';
import ABTestManager from '@/components/admin/ABTestManager';
import EmailCampaignManager from '@/components/admin/EmailCampaignManager';
import PhotoModeration from '@/components/admin/PhotoModeration';
import SystemSettings from '@/components/admin/SystemSettings';
import VendorManagement from '@/components/admin/VendorManagement';
import WaitlistManagement from '@/components/admin/WaitlistManagement';
import AuthTest from '@/components/auth/AuthTest';
import RateLimitMonitor from '@/components/admin/RateLimitMonitor';
import DisputeManagement from '@/components/admin/DisputeManagement';
import ErrorLogsDashboard from '@/components/admin/ErrorLogsDashboard';
import QuickActions from '@/components/admin/QuickActions';
import FounderProgramManagement from '@/components/admin/FounderProgramManagement';
import AmbassadorManagement from '@/components/admin/AmbassadorManagement';
import PageVisitsAnalytics from '@/components/admin/PageVisitsAnalytics';
import { FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'all', tier: 'all', country: 'all' });
  const PAGE_SIZE = 20;
  const [actionDialog, setActionDialog] = useState({ open: false, type: null, user: null });
  const [messageDialog, setMessageDialog] = useState({ open: false, type: 'single', profile: null });
  const [messageText, setMessageText] = useState('');
  const [reportGenerating, setReportGenerating] = useState(false);
  const [processingAction, setProcessingAction] = useState({ id: null, type: null });
  const [waitlistDialog, setWaitlistDialog] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState({ 
    subject: "You're invited to Afrinnect! 🌍", 
    body: "Hi {{name}},\n\nThe wait is over! Afrinnect is now live and ready for you.\n\nJoin us today to connect with African singles worldwide.\n\nClick here to get started: https://afrinnect.com\n\nSee you inside,\nThe Afrinnect Team" 
  });
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

  // Fetch Dashboard Stats (Server-Side)
  const { data: statsData = null, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminStats', {});
      return response.data;
    },
    enabled: isAdmin
  });

  // Conditional Data Fetching based on Active View
  
  // Users View
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles', currentView, page, searchTerm, filters],
    queryFn: async () => {
      if (currentView === 'users') {
        const query = {};
        
        // Status Filter
        if (filters.status === 'active') query.is_active = true;
        if (filters.status === 'banned') query.is_active = false; // Note: is_active=false usually means banned/suspended/inactive

        // Tier Filter
        if (filters.tier === 'premium') query.is_premium = true;
        if (filters.tier === 'free') query.is_premium = false;

        // Country Filter
        if (filters.country !== 'all') query.current_country = filters.country;

        // Search
        if (searchTerm) {
          query.$or = [
             { display_name: { $regex: searchTerm, $options: 'i' } },
             { user_id: searchTerm }
          ];
        }

        const skip = (page - 1) * PAGE_SIZE;
        return base44.entities.UserProfile.filter(query, '-created_date', PAGE_SIZE, skip);
      }
      
      // Fallback for other views that need "all" (capped at 500 for now)
      return base44.entities.UserProfile.list('-created_date', 500);
    },
    enabled: isAdmin && (currentView === 'users' || currentView === 'revenue' || currentView === 'verification' || currentView === 'messaging'),
    keepPreviousData: true
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', profiles],
    queryFn: async () => {
      if (currentView === 'users') {
        // Filter to only valid MongoDB ObjectIds (24 hex chars)
        const validObjectIdRegex = /^[a-f\d]{24}$/i;
        const userIds = profiles
          .map(p => p.user_id)
          .filter(id => id && validObjectIdRegex.test(id));
        if (userIds.length === 0) return [];
        // Fetch only the users for the current page of profiles
        return base44.entities.User.filter({ id: { $in: userIds } });
      }
      return base44.entities.User.list('-created_date', 500);
    },
    enabled: isAdmin && (currentView === 'users' || currentView === 'verification') // verification might need user email
  });

  // Moderation View
  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => base44.entities.Report.filter({ status: { $in: ['pending', 'under_review'] } }, '-created_date', 100),
    enabled: isAdmin && currentView === 'moderation'
  });

  // Revenue View
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' }, '-created_date', 200),
    enabled: isAdmin && currentView === 'revenue'
  });

  // Safety Monitor
  const { data: safetyChecks = [] } = useQuery({
    queryKey: ['admin-safety-checks'],
    queryFn: () => base44.entities.SafetyCheck.filter({ status: { $in: ['active', 'alert_triggered'] } }, '-created_date', 50),
    enabled: isAdmin && currentView === 'safety_monitor'
  });

  // Deleted Accounts (only needed if we add a view for it, or audit)
  // const { data: deletedAccounts = [] } = useQuery({ ... });

  // Events View
  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => base44.entities.Event.list('-created_date', 100),
    enabled: isAdmin && currentView === 'events'
  });

  // Audit Logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => base44.entities.AdminAuditLog.list('-created_date', 200),
    enabled: isAdmin && currentView === 'audit'
  });

  // Rate Limits
  const { data: rateLimitViolations = [] } = useQuery({
    queryKey: ['admin-rate-limits'],
    queryFn: async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return base44.entities.AdminAuditLog.filter({
        action_type: 'rate_limit_exceeded',
        created_date: { $gte: yesterday }
      });
    },
    enabled: isAdmin && currentView === 'security_monitor',
    refetchInterval: 60000
  });

  // Disputes
  const { data: disputes = [] } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 100),
    enabled: isAdmin && currentView === 'disputes'
  });

  // Verification
  const { data: verificationRequests = [] } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: () => base44.entities.VerificationRequest.filter({ status: 'pending' }, '-created_date', 100),
    enabled: isAdmin && currentView === 'verification'
  });

  // Analytics/Rules
  const { data: moderationRules = [] } = useQuery({
    queryKey: ['admin-moderation-rules'],
    queryFn: () => base44.entities.ModerationRule.list('-created_date', 200),
    enabled: isAdmin && currentView === 'analytics'
  });

  // Support
  const { data: supportTickets = [] } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: () => base44.entities.SupportTicket.filter({ status: { $in: ['open', 'in_progress'] } }, '-created_date', 200),
    enabled: isAdmin && currentView === 'support'
  });

  // Messaging
  const { data: broadcastMessages = [] } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: () => base44.entities.BroadcastMessage.list('-created_date', 100),
    enabled: isAdmin && currentView === 'messaging'
  });

  // Feature Flags
  const { data: featureFlags = [] } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => base44.entities.FeatureFlag.list('-created_date', 100),
    enabled: isAdmin && currentView === 'analytics'
  });

  // Pricing
  const { data: pricingPlans = [] } = useQuery({
    queryKey: ['admin-pricing-plans'],
    queryFn: () => base44.entities.PricingPlan.list('-created_date', 50),
    enabled: isAdmin && currentView === 'compliance'
  });

  // Delete user mutation (using backend function for complete cleanup)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      // Use the backend function to ensure the User auth record is strictly deleted
      // along with all related data (profiles, likes, matches, etc.)
      const response = await base44.functions.invoke('adminDeleteUser', { userId });
      
      if (response.status !== 200) {
        throw new Error(response.data?.error || 'Failed to delete user');
      }
      
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-profiles']);
      queryClient.invalidateQueries(['admin-audit-logs']);
      queryClient.invalidateQueries(['admin-deleted']);
      setActionDialog({ open: false, type: null, user: null });
      alert('User successfully deleted and can now sign up again.');
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      alert(`Failed to delete user: ${error.message}`);
    }
  });

  // Ban/suspend user mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId) => {
      const userProfiles = await base44.entities.UserProfile.filter({ user_id: userId });
      for (const profile of userProfiles) {
        await base44.entities.UserProfile.update(profile.id, { 
          is_active: false,
          is_banned: true,
          ban_reason: 'Banned by admin'
        });
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
      const response = await base44.functions.invoke('resolveReport', { reportId, action, notes });
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-reports']);
      alert('Report resolved and user notified.');
    },
    onError: (error) => {
      alert(`Failed to resolve report: ${error.message}`);
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
      setProcessingAction({ id: userId, type: 'admin' });
      await base44.entities.User.update(userId, {
        role: grantAdmin ? 'admin' : 'user'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
    },
    onSettled: () => {
      setProcessingAction({ id: null, type: null });
    }
  });

  // Change user tier mutation
  const changeTierMutation = useMutation({
    mutationFn: async ({ profileId, tier }) => {
      setProcessingAction({ id: profileId, type: 'tier' });
      // Update profile
      await base44.entities.UserProfile.update(profileId, {
        subscription_tier: tier,
        is_premium: tier !== 'free',
        premium_until: tier !== 'free' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
      });

      // Create or update subscription
      const existingSubs = await base44.entities.Subscription.filter({ user_profile_id: profileId, status: 'active' });
      
      if (tier === 'free') {
        // Cancel existing subscriptions
        for (const sub of existingSubs) {
          await base44.entities.Subscription.update(sub.id, { status: 'cancelled' });
        }
      } else {
        // Create new subscription if none exists
        if (existingSubs.length === 0) {
          await base44.entities.Subscription.create({
            user_profile_id: profileId,
            plan_type: `${tier}_yearly`,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            amount_paid: 0,
            currency: 'USD',
            payment_provider: 'manual',
            boosts_remaining: tier === 'elite' || tier === 'vip' ? 999 : 5,
            super_likes_remaining: 999,
            auto_renew: false
          });
        } else {
          // Update existing
          await base44.entities.Subscription.update(existingSubs[0].id, {
            plan_type: `${tier}_yearly`,
            status: 'active'
          });
        }
      }

      // Log action
      await base44.entities.AdminAuditLog.create({
        admin_user_id: currentUser.id,
        admin_email: currentUser.email,
        action_type: 'tier_change',
        target_user_id: profileId,
        details: { new_tier: tier }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-profiles']);
      queryClient.invalidateQueries(['admin-subscriptions']);
      queryClient.invalidateQueries(['admin-audit-logs']);
    },
    onSettled: () => {
      setProcessingAction({ id: null, type: null });
    }
  });

  // Send waitlist invites mutation
  const sendWaitlistInvitesMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendWaitlistInvites', data);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      setWaitlistDialog(false);
      alert(`Emails sent successfully to ${data.sent} people!`);
    },
    onError: (error) => {
      alert(`Failed to send emails: ${error.message}`);
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

  // Use server-side calculated stats with fallback values
  const defaultStats = {
    totalUsers: 0, totalProfiles: 0, activeUsers: 0, bannedUsers: 0, verifiedUsers: 0,
    freeUsers: 0, premiumUsers: 0, eliteUsers: 0, vipUsers: 0, totalPaidUsers: 0, conversionRate: 0,
    totalRevenue: 0, revenueThisMonth: 0, activeSubscriptions: 0,
    totalMatches: 0, matchesThisMonth: 0, matchesThisWeek: 0, matchRate: 0, usersWithMatches: 0,
    newUsersThisWeek: 0, newUsersThisMonth: 0, growthRate: 0,
    totalReports: 0, pendingReports: 0, resolvedReports: 0, activeSafetyChecks: 0,
    totalTickets: 0, openTickets: 0, urgentTickets: 0,
    totalEvents: 0, upcomingEvents: 0,
    auditLogs: 0, featureFlags: 0, moderationRules: 0
  };

  const stats = statsData || defaultStats;

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
        return (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Link to={createPageUrl('AdminLaunchChecklist')}>
                <Button variant="default" className="gap-2 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white border-0 shadow-lg">
                  <Rocket size={16} /> Launch Checklist
                </Button>
              </Link>
            </div>
            <QuickActions />
            <AdminOverview stats={stats} />
          </div>
        );
      case 'users':
        return (
          <UserManagement
            profiles={profiles}
            users={users}
            searchTerm={searchTerm}
            onSearchChange={(term) => { setSearchTerm(term); setPage(1); }}
            stats={stats}
            page={page}
            setPage={setPage}
            filters={filters}
            setFilters={(newFilters) => { setFilters(newFilters); setPage(1); }}
            hasMore={profiles.length === PAGE_SIZE}
            onViewUser={(id) => window.open(createPageUrl(`Profile?id=${id}`), '_blank')}
            onBanUser={(user) => setActionDialog({ open: true, type: 'ban', user })}
            onDeleteUser={(user) => setActionDialog({ open: true, type: 'delete', user })}
            onMessageUser={(profile) => setMessageDialog({ open: true, type: 'single', profile })}
            onToggleAdmin={(userId, grantAdmin) => toggleAdminMutation.mutate({ userId, grantAdmin })}
            onChangeTier={(profileId, tier) => changeTierMutation.mutate({ profileId, tier })}
            processingAction={processingAction}
          />
        );
      case 'moderation':
        return <ModerationCenter reports={reports} onResolveReport={resolveReportMutation.mutate} />;
      case 'fake-profiles':
        return <FakeProfileScanner />;
      case 'revenue':
        return (
          <div className="space-y-6">
            <RevenueAnalytics subscriptions={subscriptions} profiles={profiles} />
            <ChurnAnalysis />
            <SubscriptionManagement />
            <ReceiptsManagement />
          </div>
        );
      case 'verification':
        return <VerificationQueue requests={verificationRequests} profiles={profiles} currentUser={currentUser} />;
      case 'analytics':
        return (
          <div className="space-y-6">
            <ABTestManager />
            <ModerationRules rules={moderationRules} currentUser={currentUser} />
            <FeatureFlags flags={featureFlags} />
          </div>
        );
      case 'ai-insights':
        return <AIInsightsDashboard />;
      case 'automation':
        return <BackendOrchestrator />;
      case 'events':
        return <EventManagement events={events} />;
      case 'vendors':
        return <VendorManagement />;
      case 'waitlist':
        return <WaitlistManagement onSendEmail={() => setWaitlistDialog(true)} />;
      case 'founder_program':
        return <FounderProgramManagement />;
      case 'ambassadors':
        return <AmbassadorManagement />;
      case 'messaging':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-purple-600" />
                  Waitlist Invitations
                </CardTitle>
                <CardDescription>
                  Send launch emails to everyone on the waitlist who hasn't been invited yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button 
                  onClick={() => setWaitlistDialog(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Draft Launch Email
                </button>
              </CardContent>
            </Card>
            <BroadcastMessages broadcasts={broadcastMessages} profiles={profiles} currentUser={currentUser} />
            <EmailCampaignManager />
          </div>
        );
      case 'support':
        return <SupportTickets tickets={supportTickets} currentUser={currentUser} />;
      case 'compliance':
        return (
          <div className="space-y-6">
            <StoryManagement />
            <PhotoModeration />
            <CommunityManagement />
            <PricingManagement plans={pricingPlans} />
            <VideoProfileManagement />
            <ContestManagement />
            <SuccessStoryModeration />
          </div>
        );
      case 'safety_monitor':
        return <SafetyMonitorDashboard />;
      case 'settings':
        return <SystemSettings />;
      case 'audit':
        return <AuditLogs logs={auditLogs} />;
      case 'auth_test':
        return <AuthTest />;
      case 'security_monitor':
        return <RateLimitMonitor violations={rateLimitViolations} currentUser={currentUser} />;
      case 'disputes':
        return <DisputeManagement disputes={disputes} currentUser={currentUser} />;
      case 'error_logs':
        return <ErrorLogsDashboard />;
      case 'page_visits':
        return <PageVisitsAnalytics />;
      case 'reports':
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <FileText className="h-6 w-6" />
                  AI Investor Report Bot
                </CardTitle>
                <CardDescription>
                  Generate a professional, printable PDF-style report for investors and stakeholders. 
                  Our AI will analyze your latest metrics and write an executive summary for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                  <h4 className="font-semibold text-sm mb-2 text-gray-700">What's included:</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center gap-2">✨ AI-written Executive Summary</li>
                    <li className="flex items-center gap-2">📈 Growth & Revenue Charts</li>
                    <li className="flex items-center gap-2">💰 Key Financial Metrics (MRR, ARPU)</li>
                    <li className="flex items-center gap-2">🎯 Strategic Recommendations</li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg shadow-md transition-all hover:scale-[1.02]"
                  onClick={() => {
                    setReportGenerating(true);
                    // Simulate "Thinking" delay for effect, then redirect
                    setTimeout(() => {
                      window.open(createPageUrl('InvestorReport'), '_blank');
                      setReportGenerating(false);
                    }, 1500);
                  }}
                  disabled={reportGenerating}
                >
                  {reportGenerating ? (
                    <>Generating Report...</>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-5 w-5" />
                      Generate Investor Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return <AdminOverview stats={stats} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        stats={stats}
        onLogout={() => base44.auth.logout(createPageUrl('Landing'))}
        userEmail={currentUser?.email}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
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
              disabled={deleteUserMutation.isPending || banUserMutation.isPending}
              onClick={(e) => {
                e.preventDefault(); // Prevent auto-close
                if (actionDialog.type === 'delete') {
                  deleteUserMutation.mutate(actionDialog.user?.user_id);
                } else {
                  banUserMutation.mutate(actionDialog.user?.user_id);
                }
              }}
            >
              {(deleteUserMutation.isPending || banUserMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Waitlist Email Dialog */}
      <Dialog open={waitlistDialog} onOpenChange={setWaitlistDialog}>
        <DialogContent className="sm:max-w-[525px] bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Send Waitlist Invites</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will send an email to ALL waitlist members (both pending and already invited) who haven't joined yet. Use {'{{name}}'} to insert their name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-white">Subject</Label>
              <Input
                id="subject"
                value={waitlistEmail.subject}
                onChange={(e) => setWaitlistEmail({ ...waitlistEmail, subject: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body" className="text-white">Email Body</Label>
              <Textarea
                id="body"
                value={waitlistEmail.body}
                onChange={(e) => setWaitlistEmail({ ...waitlistEmail, body: e.target.value })}
                className="bg-white/10 border-white/20 text-white h-48"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setWaitlistDialog(false)}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => sendWaitlistInvitesMutation.mutate(waitlistEmail)}
              disabled={sendWaitlistInvitesMutation.isPending}
              className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-2"
            >
              {sendWaitlistInvitesMutation.isPending ? 'Sending...' : 'Send Emails'}
              <Send size={16} />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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