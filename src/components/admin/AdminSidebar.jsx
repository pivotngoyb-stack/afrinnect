import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Users, Shield, DollarSign, AlertTriangle, MessageCircle,
  BarChart3, Settings, Calendar, FileText, Bell, Database, Crown, Eye, LogOut, Brain, Cog, Briefcase, ShieldAlert, Smartphone, ChevronLeft
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Logo from '@/components/shared/Logo';

export default function AdminSidebar({ currentView, onViewChange, stats, onLogout, userEmail }) {
  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Growth',
      items: [
        { id: 'founder_program', label: 'Founding Members', icon: Crown, badge: stats?.totalFounders },
        { id: 'ambassadors', label: 'Ambassadors', icon: Users, badge: stats?.totalAmbassadors },
        { id: 'waitlist', label: 'Waitlist', icon: Users }
      ]
    },
    {
      title: 'Users',
      items: [
        { id: 'users', label: 'User Management', icon: Users, badge: stats?.totalProfiles },
        { id: 'verification', label: 'Verification', icon: Shield },
        { id: 'support', label: 'Support Tickets', icon: Bell, badge: stats?.openTickets, alert: stats?.urgentTickets > 0 }
      ]
    },
    {
      title: 'Safety',
      items: [
        { id: 'moderation', label: 'Moderation', icon: AlertTriangle, badge: stats?.pendingReports, alert: stats?.pendingReports > 0 },
        { id: 'safety_monitor', label: 'Safety Monitor', icon: Shield },
        { id: 'security_monitor', label: 'Security', icon: ShieldAlert },
        { id: 'disputes', label: 'User Appeals', icon: MessageCircle },
        { id: 'fake-profiles', label: 'Fake Profiles', icon: Shield }
      ]
    },
    {
      title: 'Business',
      items: [
        { id: 'revenue', label: 'Revenue', icon: DollarSign },
        { id: 'reports', label: 'Investor Reports', icon: FileText },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'Content',
      items: [
        { id: 'events', label: 'Events', icon: Calendar, badge: stats?.upcomingEvents },
        { id: 'vendors', label: 'Vendors', icon: Briefcase },
        { id: 'messaging', label: 'Broadcast', icon: MessageCircle },
        { id: 'compliance', label: 'Content Review', icon: FileText }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'ai-insights', label: 'AI Insights', icon: Brain },
        { id: 'automation', label: 'Automation', icon: Cog },
        { id: 'page_visits', label: 'Page Analytics', icon: Eye },
        { id: 'error_logs', label: 'Error Logs', icon: AlertTriangle },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'appstore', label: 'App Store', icon: Smartphone },
        { id: 'audit', label: 'Audit Trail', icon: Database }
      ]
    }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-black border-r border-white/10 flex flex-col h-screen sticky top-0 shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Logo showText size="default" />
        <Badge className="mt-3 bg-gradient-to-r from-red-600 to-red-700 shadow-lg">Super Admin</Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <TooltipProvider key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onViewChange(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                            isActive
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={18} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <Badge className={`text-xs py-0 px-1.5 ${item.alert ? 'bg-red-500' : 'bg-white/20'}`}>
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/10 space-y-2 bg-gradient-to-t from-black/20">
        <Link to={createPageUrl('CustomerView')}>
          <Button variant="outline" className="w-full justify-start gap-2 border-white/20 text-gray-300 hover:bg-white/5 hover:text-white transition-all">
            <Eye size={18} />
            Preview App
          </Button>
        </Link>
        
        <div className="px-3 py-2 text-xs text-gray-500 truncate" title={userEmail}>
          {userEmail}
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </div>
  );
}