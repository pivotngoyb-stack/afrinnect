import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Settings, Shield, Bell, DollarSign, Users, Sliders, 
  Save, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [featureFlags, setFeatureFlags] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

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
      await loadSettings();
    } catch (error) {
      navigate(createPageUrl('Home'));
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [systemSettings, flags] = await Promise.all([
        base44.entities.SystemSettings.list('-created_date', 50),
        base44.entities.FeatureFlag.list('-created_date', 50)
      ]);

      // Convert to object for easy access
      const settingsObj = {};
      systemSettings.forEach(s => {
        settingsObj[s.key] = { ...s.value, _id: s.id };
      });
      setSettings(settingsObj);
      setFeatureFlags(flags);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setLoading(false);
  };

  const updateSetting = (key, field, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const toggleFeatureFlag = async (flag) => {
    try {
      await base44.entities.FeatureFlag.update(flag.id, {
        is_enabled: !flag.is_enabled
      });
      setFeatureFlags(prev => prev.map(f => 
        f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f
      ));
    } catch (error) {
      console.error('Error toggling feature:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save each changed setting
      for (const [key, value] of Object.entries(settings)) {
        if (value._id) {
          const { _id, ...settingValue } = value;
          await base44.entities.SystemSettings.update(_id, {
            value: settingValue,
            updated_by: user.email
          });
        }
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setSaving(false);
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
      <AdminSidebar activePage="AdminSettings" />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">System Settings</h1>
              <p className="text-sm text-slate-400">Configure platform behavior and limits</p>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  Unsaved changes
                </Badge>
              )}
              <Button onClick={loadSettings} variant="outline" className="border-slate-700 text-slate-300">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button 
                onClick={saveSettings} 
                disabled={!hasChanges || saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="general" className="data-[state=active]:bg-orange-500">General</TabsTrigger>
              <TabsTrigger value="subscriptions" className="data-[state=active]:bg-orange-500">Subscriptions</TabsTrigger>
              <TabsTrigger value="safety" className="data-[state=active]:bg-orange-500">Safety</TabsTrigger>
              <TabsTrigger value="features" className="data-[state=active]:bg-orange-500">Features</TabsTrigger>
              <TabsTrigger value="founders" className="data-[state=active]:bg-orange-500">Founders</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Launch Configuration
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Control app visibility and launch state
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">App is Live</Label>
                      <p className="text-sm text-slate-400">When disabled, only admins can access</p>
                    </div>
                    <Switch 
                      checked={settings.launch_configuration?.is_live || false}
                      onCheckedChange={(val) => updateSetting('launch_configuration', 'is_live', val)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5" /> Rate Limits
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Control spam and abuse prevention thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Message Cooldown (ms)</Label>
                      <Input 
                        type="number"
                        value={settings.rate_limits?.message_cooldown_ms || 1000}
                        onChange={(e) => updateSetting('rate_limits', 'message_cooldown_ms', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Auth Attempts / Hour</Label>
                      <Input 
                        type="number"
                        value={settings.rate_limits?.auth_attempts_per_hour || 10}
                        onChange={(e) => updateSetting('rate_limits', 'auth_attempts_per_hour', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Profile Views / Minute</Label>
                      <Input 
                        type="number"
                        value={settings.rate_limits?.profile_views_per_minute || 30}
                        onChange={(e) => updateSetting('rate_limits', 'profile_views_per_minute', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Duplicate Window (ms)</Label>
                      <Input 
                        type="number"
                        value={settings.rate_limits?.duplicate_window_ms || 10000}
                        onChange={(e) => updateSetting('rate_limits', 'duplicate_window_ms', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Settings */}
            <TabsContent value="subscriptions" className="space-y-6">
              {['free', 'premium', 'elite', 'vip'].map((tier) => (
                <Card key={tier} className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white capitalize flex items-center gap-2">
                      <DollarSign className="w-5 h-5" /> {tier} Tier Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-slate-300">Daily Messages</Label>
                        <Input 
                          type="number"
                          value={settings.subscription_limits?.[tier]?.daily_messages ?? 20}
                          onChange={(e) => {
                            const newLimits = { ...(settings.subscription_limits || {}) };
                            newLimits[tier] = { ...newLimits[tier], daily_messages: parseInt(e.target.value) };
                            updateSetting('subscription_limits', tier, newLimits[tier]);
                          }}
                          className="mt-2 bg-slate-800 border-slate-700 text-white"
                          placeholder="-1 for unlimited"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Daily Likes</Label>
                        <Input 
                          type="number"
                          value={settings.subscription_limits?.[tier]?.daily_likes ?? 10}
                          onChange={(e) => {
                            const newLimits = { ...(settings.subscription_limits || {}) };
                            newLimits[tier] = { ...newLimits[tier], daily_likes: parseInt(e.target.value) };
                            updateSetting('subscription_limits', tier, newLimits[tier]);
                          }}
                          className="mt-2 bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Daily Super Likes</Label>
                        <Input 
                          type="number"
                          value={settings.subscription_limits?.[tier]?.daily_super_likes ?? 0}
                          onChange={(e) => {
                            const newLimits = { ...(settings.subscription_limits || {}) };
                            newLimits[tier] = { ...newLimits[tier], daily_super_likes: parseInt(e.target.value) };
                            updateSetting('subscription_limits', tier, newLimits[tier]);
                          }}
                          className="mt-2 bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Profile Boosts</Label>
                        <Input 
                          type="number"
                          value={settings.subscription_limits?.[tier]?.profile_boosts ?? 0}
                          onChange={(e) => {
                            const newLimits = { ...(settings.subscription_limits || {}) };
                            newLimits[tier] = { ...newLimits[tier], profile_boosts: parseInt(e.target.value) };
                            updateSetting('subscription_limits', tier, newLimits[tier]);
                          }}
                          className="mt-2 bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={settings.subscription_limits?.[tier]?.can_see_who_likes || false}
                          />
                          <Label className="text-slate-300">See Who Likes</Label>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={settings.subscription_limits?.[tier]?.incognito_mode || false}
                          />
                          <Label className="text-slate-300">Incognito Mode</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Safety Settings */}
            <TabsContent value="safety" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" /> AI Safety Thresholds
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure AI moderation sensitivity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Flag Risk Score</Label>
                      <Input 
                        type="number"
                        value={settings.safety_thresholds?.flag_risk_score || 50}
                        onChange={(e) => updateSetting('safety_thresholds', 'flag_risk_score', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500 mt-1">Score at which content is flagged for review</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Auto-Report Score</Label>
                      <Input 
                        type="number"
                        value={settings.safety_thresholds?.auto_report_risk_score || 70}
                        onChange={(e) => updateSetting('safety_thresholds', 'auto_report_risk_score', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500 mt-1">Score at which auto-report is created</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Delete Risk Score</Label>
                      <Input 
                        type="number"
                        value={settings.safety_thresholds?.delete_risk_score || 80}
                        onChange={(e) => updateSetting('safety_thresholds', 'delete_risk_score', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500 mt-1">Score at which content is auto-deleted</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Auto-Enforce Score</Label>
                      <Input 
                        type="number"
                        value={settings.safety_thresholds?.auto_enforce_risk_score || 85}
                        onChange={(e) => updateSetting('safety_thresholds', 'auto_enforce_risk_score', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500 mt-1">Score at which user is auto-suspended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Feature Flags */}
            <TabsContent value="features" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Feature Flags</CardTitle>
                  <CardDescription className="text-slate-400">
                    Enable or disable app features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{flag.display_name}</p>
                        <p className="text-sm text-slate-400">{flag.description}</p>
                        {flag.rollout_percentage > 0 && flag.rollout_percentage < 100 && (
                          <Badge className="mt-2 bg-blue-500/20 text-blue-400">
                            {flag.rollout_percentage}% rollout
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {flag.enabled_for_premium && (
                          <Badge className="bg-orange-500/20 text-orange-400">Premium Only</Badge>
                        )}
                        <Switch 
                          checked={flag.is_enabled}
                          onCheckedChange={() => toggleFeatureFlag(flag)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Founders Program */}
            <TabsContent value="founders" className="space-y-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" /> Founding Member Program
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure the founding member trial program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <Label className="text-white">Founders Mode Enabled</Label>
                      <p className="text-sm text-slate-400">Auto-grant founding member status to new users</p>
                    </div>
                    <Switch 
                      checked={settings.founder_program?.founders_mode_enabled || false}
                      onCheckedChange={(val) => updateSetting('founder_program', 'founders_mode_enabled', val)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <Label className="text-white">Auto-Assign New Users</Label>
                      <p className="text-sm text-slate-400">Automatically make new signups founding members</p>
                    </div>
                    <Switch 
                      checked={settings.founder_program?.auto_assign_new_users || false}
                      onCheckedChange={(val) => updateSetting('founder_program', 'auto_assign_new_users', val)}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Trial Duration (Days)</Label>
                    <Input 
                      type="number"
                      value={settings.founder_program?.trial_days || 183}
                      onChange={(e) => updateSetting('founder_program', 'trial_days', parseInt(e.target.value))}
                      className="mt-2 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Ambassador Program</CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure affiliate/ambassador settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <Label className="text-white">Program Enabled</Label>
                      <p className="text-sm text-slate-400">Allow ambassador signups and referrals</p>
                    </div>
                    <Switch 
                      checked={settings.ambassador_program?.enabled || false}
                      onCheckedChange={(val) => updateSetting('ambassador_program', 'enabled', val)}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Attribution Window (Days)</Label>
                      <Input 
                        type="number"
                        value={settings.ambassador_program?.default_attribution_days || 30}
                        onChange={(e) => updateSetting('ambassador_program', 'default_attribution_days', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Commission Hold (Days)</Label>
                      <Input 
                        type="number"
                        value={settings.ambassador_program?.commission_hold_days || 14}
                        onChange={(e) => updateSetting('ambassador_program', 'commission_hold_days', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Min Payout Threshold ($)</Label>
                      <Input 
                        type="number"
                        value={settings.ambassador_program?.min_payout_threshold || 50}
                        onChange={(e) => updateSetting('ambassador_program', 'min_payout_threshold', parseInt(e.target.value))}
                        className="mt-2 bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}