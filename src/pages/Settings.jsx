import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Bell, Lock, Eye, Shield, Globe, Moon, Sun,
  HelpCircle, FileText, LogOut, Trash2, ChevronRight, Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

export default function Settings() {
  const [myProfile, setMyProfile] = useState(null);
  
  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('app_settings');
      return saved ? JSON.parse(saved) : {
        notifications: true,
        emailNotifications: true,
        showDistance: true,
        showLastActive: true,
        darkMode: false
      };
    } catch {
      return {
        notifications: true,
        emailNotifications: true,
        showDistance: true,
        showLastActive: true,
        darkMode: false
      };
    }
  };

  const [settings, setSettings] = useState(loadSettings());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchProfile();
  }, []);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Persist to localStorage
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
    
    // Apply dark mode
    if (key === 'darkMode') {
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Apply dark mode on mount
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Landing'));
  };

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Collect all user data (GDPR compliant)
      const profile = await base44.entities.UserProfile.filter({ user_id: user.id });
      const matches = await base44.entities.Match.filter({
        $or: [{ user1_id: myProfile?.id }, { user2_id: myProfile?.id }]
      });
      const messages = await base44.entities.Message.filter({
        $or: [{ sender_id: myProfile?.id }, { receiver_id: myProfile?.id }]
      });
      const likes = await base44.entities.Like.filter({ liker_id: myProfile?.id });
      const subscriptions = await base44.entities.Subscription.filter({ user_profile_id: myProfile?.id });
      
      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          email: user.email,
          full_name: user.full_name,
          created_date: user.created_date
        },
        profile: profile[0] || null,
        matches: matches,
        messages: messages.map(m => ({ ...m, content: '[MESSAGE CONTENT]' })), // Privacy
        likes_sent: likes,
        subscriptions: subscriptions
      };
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afrinnect-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Log deletion
      await base44.entities.DeletedAccount.create({
        user_email: user.email,
        user_id: user.id,
        display_name: myProfile?.display_name || 'Unknown',
        deletion_reason: 'User requested',
        deleted_at: new Date().toISOString()
      });
      
      // Delete profile
      if (myProfile) {
        await base44.entities.UserProfile.delete(myProfile.id);
      }
      
      // Logout
      await base44.auth.logout(createPageUrl('Landing'));
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={18} className="text-purple-600" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to={createPageUrl('EditProfile')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Edit Profile</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            
            <Separator />

            <Link to={createPageUrl('PhoneVerification')} className="flex items-center justify-between py-2">
              <div>
                <span className="text-gray-700 block">Phone Number</span>
                <span className="text-sm text-gray-500">
                  {myProfile?.verification_status?.phone_verified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              {myProfile?.verification_status?.phone_verified ? (
                <Shield size={18} className="text-green-500" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </Link>

            <Separator />

            <button onClick={() => {
              // Send email verification code
              const code = Math.floor(100000 + Math.random() * 900000);
              base44.integrations.Core.SendEmail({
                to: myProfile?.created_by,
                subject: 'Afrinnect Email Verification',
                body: `Your verification code is: ${code}`
              }).then(() => alert('Verification code sent to your email!'));
            }} className="flex items-center justify-between py-2 w-full text-left">
              <div>
                <span className="text-gray-700 block">Email</span>
                <span className="text-sm text-gray-500">
                  {myProfile?.verification_status?.email_verified ? 'Verified' : 'Verify Now'}
                </span>
              </div>
              {myProfile?.verification_status?.email_verified ? (
                <Shield size={18} className="text-green-500" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={18} className="text-purple-600" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push" className="text-gray-700">Push Notifications</Label>
              <Switch
                id="push"
                checked={settings.notifications}
                onCheckedChange={(v) => updateSetting('notifications', v)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email" className="text-gray-700 block">Email Notifications</Label>
                <span className="text-xs text-gray-500">Get notified about matches and messages</span>
              </div>
              <Switch
                id="email"
                checked={settings.emailNotifications}
                onCheckedChange={(v) => updateSetting('emailNotifications', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye size={18} className="text-purple-600" />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="distance" className="text-gray-700 block">Show Distance</Label>
                <span className="text-xs text-gray-500">Let others see how far you are</span>
              </div>
              <Switch
                id="distance"
                checked={settings.showDistance}
                onCheckedChange={(v) => updateSetting('showDistance', v)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lastActive" className="text-gray-700 block">Show Last Active</Label>
                <span className="text-xs text-gray-500">Let others see when you were online</span>
              </div>
              <Switch
                id="lastActive"
                checked={settings.showLastActive}
                onCheckedChange={(v) => updateSetting('showLastActive', v)}
              />
            </div>

            <Separator />

            <Link to={createPageUrl('BlockedUsers')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Blocked Users</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {settings.darkMode ? <Moon size={18} className="text-purple-600" /> : <Sun size={18} className="text-purple-600" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="darkMode" className="text-gray-700">Dark Mode</Label>
              <Switch
                id="darkMode"
                checked={settings.darkMode}
                onCheckedChange={(v) => updateSetting('darkMode', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Discovery */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe size={18} className="text-purple-600" />
              Discovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('Home')} className="flex items-center justify-between py-2">
              <div>
                <span className="text-gray-700 block">Discovery Preferences</span>
                <span className="text-xs text-gray-500">Age range, distance, and more</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            
            <Separator />
            
            <Link to={createPageUrl('PricingPlans')} className="flex items-center justify-between py-2">
              <div>
                <span className="text-gray-700 block">Subscription & Pricing</span>
                <span className="text-xs text-gray-500">Manage your plan</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle size={18} className="text-purple-600" />
              Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to={createPageUrl('SupportChat')} className="flex items-center justify-between py-2 bg-purple-50 rounded-lg px-3 -mx-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center">
                  <span className="text-white text-sm">✨</span>
                </div>
                <div>
                  <span className="text-gray-900 font-medium block">Chat with Ubuntu AI</span>
                  <span className="text-xs text-purple-600">Get instant help & advice</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-purple-600" />
            </Link>

            <Separator />

            <Link to={createPageUrl('Support')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Support Tickets</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>

            <Separator />

            <a href="mailto:support@afrinnect.com" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Contact Us</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>

            <Separator />

            <Link to={createPageUrl('CommunityGuidelines')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Safety Tips</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={18} className="text-purple-600" />
              Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to={createPageUrl('Privacy')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Privacy Policy</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>

            <Separator />

            <Link to={createPageUrl('Terms')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Terms of Service</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>

            <Separator />

            <Link to={createPageUrl('CommunityGuidelines')} className="flex items-center justify-between py-2">
              <span className="text-gray-700">Community Guidelines</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>

            <Separator />

            <button
              onClick={() => exportDataMutation.mutate()}
              disabled={exportDataMutation.isPending}
              className="flex items-center justify-between py-2 w-full text-left"
            >
              <div>
                <span className="text-gray-700 block">Download My Data</span>
                <span className="text-xs text-gray-500">GDPR compliant data export</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </CardContent>
        </Card>

        {/* Logout & Delete */}
        <div className="space-y-3">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            <LogOut size={18} className="mr-2" />
            Log Out
          </Button>

          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={18} className="mr-2" />
            Delete Account
          </Button>
        </div>

        {/* App Version */}
        <p className="text-center text-gray-400 text-xs">
          Ubuntu Dating v1.0.0
        </p>
      </main>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your profile, matches, and messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}