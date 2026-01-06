import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, Heart, Calendar, User, MessageCircle, Compass, Sparkles, Bell } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import ScreenshotAlertNotif from '@/components/notifications/ScreenshotAlertNotif';
import SubscriptionReminder from '@/components/monetization/SubscriptionReminder';
import RetentionRewards from '@/components/monetization/RetentionRewards';
import { LanguageProvider, useLanguage } from '@/components/i18n/LanguageContext';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { ErrorLoggerProvider } from '@/components/analytics/ErrorLogger'; // Replaced ErrorMonitor
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import { useServiceWorker } from '@/components/shared/ServiceWorkerManager';
import { useNetworkStatus } from '@/components/shared/NetworkStatus';
import CookieConsent from '@/components/legal/CookieConsent';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import { GlobalErrorHandler } from '@/components/shared/GlobalErrorHandler';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import InstallPrompt from '@/components/mobile/InstallPrompt';

const PAGES_WITHOUT_NAV = ['Chat', 'Onboarding', 'EditProfile', 'Report', 'Settings', 'Landing', 'AdminDashboard', 'CustomerView', 'Terms', 'Privacy', 'CommunityGuidelines', 'LegalAcceptance', 'Notifications', 'PhoneVerification', 'IDVerification', 'VerifyPhoto', 'VideoChat', 'VirtualGifts', 'DailyMatches', 'SuccessStories', 'EventDetails', 'CreateEvent', 'CompatibilityQuizzes', 'ReferralProgram', 'LanguageExchangeHub', 'VendorManagement', 'Marketplace', 'PasswordReset'];

function LayoutContent({ children, currentPageName }) {
  const [myProfile, setMyProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(true);
  const { t } = useLanguage();
  
  useEffect(() => {
    const checkProfile = async () => {
      // Skip all auth checks for public pages
      const publicPages = ['Home', 'Landing', 'Terms', 'Privacy', 'CommunityGuidelines'];
      if (publicPages.includes(currentPageName)) {
        return;
      }

      try {
        const user = await base44.auth.me();
        if (user) {
          // Check legal acceptance first for ALL authenticated users
          if (currentPageName !== 'LegalAcceptance') {
            const acceptances = await base44.entities.LegalAcceptance.filter({ user_id: user.id });
            if (acceptances.length === 0) {
              window.location.href = createPageUrl('LegalAcceptance');
              return;
            }
          }

          // Then check profile
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length === 0 && currentPageName !== 'Onboarding' && currentPageName !== 'LegalAcceptance') {
            window.location.href = createPageUrl('Onboarding');
            return;
          }

          if (profiles.length > 0) {
            const profile = profiles[0];
            setMyProfile(profile);
          }
          setHasProfile(profiles.length > 0);
        }
      } catch (e) {
        // Not logged in - no action needed for public pages
        console.error('Auth check error:', e);
      }
    };
    checkProfile();
  }, [currentPageName]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-count', myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.id) return [];
      try {
        return await base44.entities.Notification.filter(
          { user_profile_id: myProfile.id, is_read: false },
          '-created_date',
          20
        );
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
      }
    },
    enabled: !!myProfile?.id,
    refetchInterval: false, // Disable polling
    refetchOnWindowFocus: true, // Only refresh on focus
    staleTime: 300000, // Cache for 5 minutes
    retry: 1,
    retryDelay: 5000
  });

  const unreadNotifications = notifications.length;

  const showNav = !PAGES_WITHOUT_NAV.includes(currentPageName);

  const navItems = [
    { name: 'Home', icon: Compass, label: t('home.title') },
    { name: 'Stories', icon: Sparkles, label: 'Stories' },
    { name: 'Matches', icon: Heart, label: t('matches.title') },
    { name: 'Events', icon: Calendar, label: 'Events' },
    { name: 'Profile', icon: User, label: t('profile.editProfile').replace(' Profile', '').replace(' le Profil', '') }
  ];

  return (
    <>
      <OfflineIndicator />
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

      {/* Screenshot Alert Notifications */}
      {myProfile && <ScreenshotAlertNotif myProfileId={myProfile.id} />}

      {/* Subscription Expiry Reminder */}
      {myProfile && <SubscriptionReminder userProfile={myProfile} />}

      {/* Retention Rewards */}
      {myProfile && <RetentionRewards userProfile={myProfile} />}

      {/* Push Notifications */}
      <PushNotificationSetup userProfile={myProfile} />

      {/* Mobile Install Prompt */}
      <InstallPrompt />

      {/* Cookie Consent */}
      <CookieConsent />

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
          {/* Copyright Footer */}
          <div className="bg-gray-50 border-t border-gray-100 py-2 text-center">
            <p className="text-xs text-gray-500">© 2025 Afrinnect. All rights reserved.</p>
          </div>
        </nav>
        )}
        </div>
        </>
        );
        }

export default function Layout(props) {
          useServiceWorker();
          const { isOnline } = useNetworkStatus();

          return (
            <ErrorBoundary>
              <ErrorLoggerProvider>
                <LanguageProvider>
                  <GoogleAnalytics />
                  <GlobalErrorHandler />
                  <LayoutContent {...props} />
                </LanguageProvider>
              </ErrorLoggerProvider>
            </ErrorBoundary>
          );
          }