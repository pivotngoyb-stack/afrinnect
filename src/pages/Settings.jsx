import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Bell, Lock, Eye, Shield, Globe, Moon, Sun,
  HelpCircle, FileText, LogOut, Trash2, ChevronRight
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
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    showDistance: true,
    showLastActive: true,
    darkMode: false
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (myProfile) {
        await base44.entities.UserProfile.update(myProfile.id, { is_active: false });
      }
      await base44.auth.logout();
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

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-gray-700 block">Phone Number</span>
                <span className="text-sm text-gray-500">Verified</span>
              </div>
              <Shield size={18} className="text-green-500" />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-gray-700 block">Email</span>
                <span className="text-sm text-gray-500">{myProfile?.created_by || 'Not set'}</span>
              </div>
              <Shield size={18} className="text-green-500" />
            </div>
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
            <a href="#" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Help Center</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>

            <Separator />

            <a href="#" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Contact Us</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>

            <Separator />

            <a href="#" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Safety Tips</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>
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
            <a href="#" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Privacy Policy</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>

            <Separator />

            <a href="#" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Terms of Service</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>

            <Separator />

            <a href="#" className="flex items-center justify-between py-2">
              <span className="text-gray-700">Community Guidelines</span>
              <ChevronRight size={20} className="text-gray-400" />
            </a>
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