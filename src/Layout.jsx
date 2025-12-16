import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, Heart, Calendar, User, MessageCircle, Compass, Sparkles, Bell } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';

const PAGES_WITHOUT_NAV = ['Chat', 'Onboarding', 'EditProfile', 'Premium', 'Report', 'Settings', 'Landing', 'AdminDashboard', 'CustomerView', 'Terms', 'Privacy', 'CommunityGuidelines', 'LegalAcceptance', 'Notifications', 'PhoneVerification', 'IDVerification', 'VerifyPhoto'];

export default function Layout({ children, currentPageName }) {
  const [myProfile, setMyProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(true);
  
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          // Check legal acceptance first for ALL users
          if (currentPageName !== 'LegalAcceptance' && currentPageName !== 'Landing' && currentPageName !== 'Terms' && currentPageName !== 'Privacy' && currentPageName !== 'CommunityGuidelines') {
            const acceptances = await base44.entities.LegalAcceptance.filter({ user_id: user.id });
            if (acceptances.length === 0) {
              window.location.href = createPageUrl('LegalAcceptance');
              return;
            }
          }
          
          // Then check profile
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length === 0 && currentPageName !== 'Onboarding' && currentPageName !== 'LegalAcceptance' && currentPageName !== 'Landing') {
            window.location.href = createPageUrl('Onboarding');
            return;
          }
          
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
          setHasProfile(profiles.length > 0);
        }
      } catch (e) {
        // Not logged in
      }
    };
    checkProfile();
  }, [currentPageName]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-count', myProfile?.id],
    queryFn: () => base44.entities.Notification.filter(
      { user_profile_id: myProfile.id, is_read: false }
    ),
    enabled: !!myProfile,
    refetchInterval: 30000 // Check every 30 seconds
  });

  const unreadNotifications = notifications.length;

  const showNav = !PAGES_WITHOUT_NAV.includes(currentPageName);

  const navItems = [
    { name: 'Home', icon: Compass, label: 'Discover' },
    { name: 'Matches', icon: Heart, label: 'Matches' },
    { name: 'Events', icon: Calendar, label: 'Events' },
    { name: 'Notifications', icon: Bell, label: 'Alerts', badge: unreadNotifications },
    { name: 'Profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        :root {
          --color-primary: #7c3aed;
          --color-primary-dark: #6d28d9;
          --color-accent: #f59e0b;
          --color-accent-dark: #d97706;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes pulse-heart {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .animate-pulse-heart {
          animation: pulse-heart 1s ease-in-out infinite;
        }
      `}</style>

      {children}

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-inset-bottom">
          <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
            {navItems.map(item => {
              const isActive = currentPageName === item.name;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    isActive 
                      ? 'text-purple-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className="relative">
                    <Icon 
                      size={24} 
                      className={isActive ? 'fill-purple-100' : ''}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {item.badge > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-purple-600 text-white text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-1 w-1 h-1 bg-purple-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}