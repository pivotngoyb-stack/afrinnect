import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Users, Shield, DollarSign, AlertTriangle, MessageCircle,
  BarChart3, Settings, Calendar, FileText, Bell, Database, Crown, Eye, LogOut, Brain, Cog
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Logo from '@/components/shared/Logo';

export default function AdminSidebar({ currentView, onViewChange, stats, onLogout, userEmail }) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: stats?.totalProfiles },
    { id: 'verification', label: 'Verification', icon: Shield, badge: stats?.verifiedUsers },
    { id: 'moderation', label: 'Moderation', icon: AlertTriangle, badge: stats?.pendingReports, alert: stats?.pendingReports > 0 },
    { id: 'safety_monitor', label: 'Safety Monitor', icon: Shield },
    { id: 'ai-insights', label: 'AI Insights', icon: Brain },
    { id: 'automation', label: 'Automation', icon: Cog },
    { id: 'fake-profiles', label: 'Fake Profiles', icon: Shield },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'events', label: 'Events', icon: Calendar, badge: stats?.totalEvents },
    { id: 'messaging', label: 'Broadcast', icon: MessageCircle },
    { id: 'support', label: 'Support', icon: Bell },
    { id: 'compliance', label: 'Compliance', icon: FileText },
    { id: 'settings', label: 'Audit Logs', icon: Shield, badge: stats?.auditLogs }
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Logo showText size="default" />
        <Badge className="mt-3 bg-red-600">Super Admin</Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <Badge className={item.alert ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}>
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link to={createPageUrl('CustomerView')}>
          <Button variant="outline" className="w-full justify-start gap-2 border-gray-700 text-gray-300 hover:bg-gray-800">
            <Eye size={18} />
            Preview App
          </Button>
        </Link>
        
        <div className="px-3 py-2 text-xs text-gray-500">
          {userEmail}
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </div>
  );
}