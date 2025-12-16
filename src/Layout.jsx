import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, Heart, Calendar, User, MessageCircle, Compass, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const PAGES_WITHOUT_NAV = ['Chat', 'Onboarding', 'EditProfile', 'Premium', 'Report', 'Settings'];

export default function Layout({ children, currentPageName }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasProfile, setHasProfile] = useState(true);
  
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length === 0 && currentPageName !== 'Onboarding') {
            window.location.href = createPageUrl('Onboarding');
          }
          setHasProfile(profiles.length > 0);
        }
      } catch (e) {
        // Not logged in
      }
    };
    checkProfile();
  }, [currentPageName]);

  const showNav = !PAGES_WITHOUT_NAV.includes(currentPageName);

  const navItems = [
    { name: 'Home', icon: Compass, label: 'Discover' },
    { name: 'Matches', icon: Heart, label: 'Matches' },
    { name: 'Events', icon: Calendar, label: 'Events' },
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
                    {item.name === 'Matches' && unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-purple-600 text-white text-xs">
                        {unreadCount}
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