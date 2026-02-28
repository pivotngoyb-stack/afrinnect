import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Bell, Send, Users, Crown, Star, Filter, RefreshCw, 
  Check, AlertTriangle, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminBroadcast() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [userCount, setUserCount] = useState(0);

  const [message, setMessage] = useState({
    title: "",
    body: "",
    type: "admin_message",
    linkTo: "",
  });

  const [filters, setFilters] = useState({
    allUsers: true,
    premiumOnly: false,
    foundingOnly: false,
    freeOnly: false,
    activeOnly: true,
    genders: [],
    countries: [],
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) calculateRecipients();
  }, [filters, user]);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
      setUser(currentUser);
      setLoading(false);
    } catch (error) {
      navigate(createPageUrl('Home'));
    }
  };

  const calculateRecipients = async () => {
    try {
      let profiles = await base44.entities.UserProfile.list('-created_date', 2000);

      // Apply filters
      if (!filters.allUsers) {
        if (filters.premiumOnly) profiles = profiles.filter(p => p.is_premium);
        if (filters.foundingOnly) profiles = profiles.filter(p => p.is_founding_member);
        if (filters.freeOnly) profiles = profiles.filter(p => !p.is_premium);
      }
      if (filters.activeOnly) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        profiles = profiles.filter(p => p.last_active && new Date(p.last_active) >= weekAgo);
      }
      if (filters.genders.length > 0) {
        profiles = profiles.filter(p => filters.genders.includes(p.gender));
      }
      if (filters.countries.length > 0) {
        profiles = profiles.filter(p => filters.countries.includes(p.current_country));
      }

      // Exclude banned/suspended
      profiles = profiles.filter(p => !p.is_banned && !p.is_suspended);

      setUserCount(profiles.length);
    } catch (error) {
      console.error('Error calculating recipients:', error);
    }
  };

  const sendBroadcast = async () => {
    if (!message.title || !message.body) return;
    
    setSending(true);
    try {
      let profiles = await base44.entities.UserProfile.list('-created_date', 2000);

      // Apply same filters
      if (!filters.allUsers) {
        if (filters.premiumOnly) profiles = profiles.filter(p => p.is_premium);
        if (filters.foundingOnly) profiles = profiles.filter(p => p.is_founding_member);
        if (filters.freeOnly) profiles = profiles.filter(p => !p.is_premium);
      }
      if (filters.activeOnly) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        profiles = profiles.filter(p => p.last_active && new Date(p.last_active) >= weekAgo);
      }
      if (filters.genders.length > 0) {
        profiles = profiles.filter(p => filters.genders.includes(p.gender));
      }
      if (filters.countries.length > 0) {
        profiles = profiles.filter(p => filters.countries.includes(p.current_country));
      }
      profiles = profiles.filter(p => !p.is_banned && !p.is_suspended);

      // Create notifications in batches
      const notifications = profiles.map(p => ({
        user_profile_id: p.id,
        user_id: p.user_id,
        type: message.type,
        title: message.title,
        message: message.body,
        link_to: message.linkTo || null,
        is_admin: true,
        is_read: false
      }));

      // Batch create
      const batchSize = 50;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await base44.entities.Notification.bulkCreate(batch);
      }

      setSent(true);
      setTimeout(() => setSent(false), 3000);
      
      // Clear form
      setMessage({ title: "", body: "", type: "admin_message", linkTo: "" });
    } catch (error) {
      console.error('Error sending broadcast:', error);
    }
    setSending(false);
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
      <AdminSidebar activePage="AdminBroadcast" />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Broadcast Messages</h1>
              <p className="text-sm text-slate-400">Send notifications to users</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Message Composer */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Compose Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Notification Type</Label>
                    <Select value={message.type} onValueChange={(val) => setMessage({ ...message, type: val })}>
                      <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="admin_message">Admin Message</SelectItem>
                        <SelectItem value="match">Feature Announcement</SelectItem>
                        <SelectItem value="like">Promotion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Title</Label>
                    <Input
                      value={message.title}
                      onChange={(e) => setMessage({ ...message, title: e.target.value })}
                      placeholder="Enter notification title..."
                      className="mt-2 bg-slate-800 border-slate-700 text-white"
                      maxLength={100}
                    />
                    <p className="text-xs text-slate-500 mt-1">{message.title.length}/100 characters</p>
                  </div>

                  <div>
                    <Label className="text-slate-300">Message Body</Label>
                    <Textarea
                      value={message.body}
                      onChange={(e) => setMessage({ ...message, body: e.target.value })}
                      placeholder="Enter your message..."
                      className="mt-2 bg-slate-800 border-slate-700 text-white min-h-[120px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-slate-500 mt-1">{message.body.length}/500 characters</p>
                  </div>

                  <div>
                    <Label className="text-slate-300">Link To (Optional)</Label>
                    <Input
                      value={message.linkTo}
                      onChange={(e) => setMessage({ ...message, linkTo: e.target.value })}
                      placeholder="e.g., Premium, Settings, Discover"
                      className="mt-2 bg-slate-800 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">Page to open when notification is clicked</p>
                  </div>

                  {/* Preview */}
                  {(message.title || message.body) && (
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Preview</p>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{message.title || 'Title'}</p>
                          <p className="text-slate-300 text-sm">{message.body || 'Message body'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Send Button */}
              <Button
                onClick={sendBroadcast}
                disabled={!message.title || !message.body || sending || userCount === 0}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-lg"
              >
                {sending ? (
                  <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
                ) : sent ? (
                  <><Check className="w-5 h-5 mr-2" /> Sent Successfully!</>
                ) : (
                  <><Send className="w-5 h-5 mr-2" /> Send to {userCount.toLocaleString()} Users</>
                )}
              </Button>
            </div>

            {/* Filters */}
            <div className="space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Filter className="w-5 h-5" /> Target Audience
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {userCount.toLocaleString()} users will receive this message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* User Type */}
                  <div className="space-y-3">
                    <Label className="text-slate-300">User Type</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={filters.allUsers}
                          onCheckedChange={(val) => setFilters({ ...filters, allUsers: val, premiumOnly: false, foundingOnly: false, freeOnly: false })}
                        />
                        <span className="text-white flex items-center gap-2">
                          <Users className="w-4 h-4" /> All Users
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={filters.premiumOnly}
                          onCheckedChange={(val) => setFilters({ ...filters, premiumOnly: val, allUsers: false })}
                        />
                        <span className="text-white flex items-center gap-2">
                          <Crown className="w-4 h-4 text-orange-400" /> Premium Only
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={filters.foundingOnly}
                          onCheckedChange={(val) => setFilters({ ...filters, foundingOnly: val, allUsers: false })}
                        />
                        <span className="text-white flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" /> Founding Members
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={filters.freeOnly}
                          onCheckedChange={(val) => setFilters({ ...filters, freeOnly: val, allUsers: false })}
                        />
                        <span className="text-white">Free Users Only</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Filter */}
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <Label className="text-white">Active Users Only</Label>
                      <p className="text-xs text-slate-400">Active in last 7 days</p>
                    </div>
                    <Switch 
                      checked={filters.activeOnly}
                      onCheckedChange={(val) => setFilters({ ...filters, activeOnly: val })}
                    />
                  </div>

                  {/* Gender Filter */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Gender</Label>
                    <div className="flex flex-wrap gap-2">
                      {['man', 'woman', 'non_binary', 'other'].map(gender => (
                        <Badge 
                          key={gender}
                          className={`cursor-pointer ${
                            filters.genders.includes(gender) 
                              ? 'bg-orange-500' 
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                          onClick={() => {
                            const genders = filters.genders.includes(gender)
                              ? filters.genders.filter(g => g !== gender)
                              : [...filters.genders, gender];
                            setFilters({ ...filters, genders });
                          }}
                        >
                          {gender.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                    {filters.genders.length === 0 && (
                      <p className="text-xs text-slate-500">No filter = all genders</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warning */}
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium">Important</p>
                      <p className="text-yellow-400/80 text-sm">
                        This will send push notifications and in-app notifications to all selected users. 
                        Use responsibly to avoid notification fatigue.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}