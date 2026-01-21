import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Track conversion events for monetization
export function useConversionTracker() {
  const trackEvent = async (eventName, properties = {}) => {
    try {
      // Check if user is authenticated first
      const isAuth = await base44.auth.isAuthenticated();
      
      if (isAuth) {
        const user = await base44.auth.me();
        const profile = user ? (await base44.entities.UserProfile.filter({ user_id: user.id }))[0] : null;

        // Log conversion event for authenticated users
        await base44.entities.ProfileAnalytics.create({
          user_profile_id: profile?.id || 'anonymous',
          event_type: eventName,
          event_data: properties,
          timestamp: new Date().toISOString()
        });
      }

      // Track via Google Analytics for all users (authenticated or not)
      base44.analytics.track({
        eventName: eventName,
        properties: properties
      });
    } catch (e) {
      // Silently fail for tracking - don't disrupt user experience
      console.debug('Conversion tracking skipped:', eventName);
    }
  };

  return { trackEvent };
}

// Revenue tracking for admin analytics
export function trackRevenue(amount, currency, source, userId) {
  try {
    base44.entities.ProfileAnalytics.create({
      user_profile_id: userId,
      event_type: 'revenue',
      event_data: {
        amount,
        currency,
        source,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('Failed to track revenue:', e);
  }
}

// Conversion funnel tracking
export const CONVERSION_EVENTS = {
  // Registration funnel
  LANDING_VIEW: 'landing_viewed',
  SIGNUP_START: 'signup_started',
  SIGNUP_COMPLETE: 'signup_completed',
  PROFILE_CREATED: 'profile_created',
  
  // Engagement funnel
  FIRST_LIKE: 'first_like_sent',
  FIRST_MATCH: 'first_match_created',
  FIRST_MESSAGE: 'first_message_sent',
  
  // Premium funnel
  PREMIUM_VIEW: 'premium_page_viewed',
  PREMIUM_CLICK: 'premium_upgrade_clicked',
  PREMIUM_PURCHASE: 'premium_purchased',
  
  // Feature usage
  STORY_VIEW: 'story_viewed',
  STORY_POST: 'story_posted',
  EVENT_JOIN: 'event_joined',
  COMMUNITY_JOIN: 'community_joined',
  VERIFICATION_REQUEST: 'verification_requested'
};