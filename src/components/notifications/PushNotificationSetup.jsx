import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/components/firebase/firebaseConfig';

export default function PushNotificationSetup({ userProfile }) {
  useEffect(() => {
    if (!userProfile) return;

    const setupPushNotifications = async () => {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        const messaging = getMessaging(app);
        
        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY' // You'll need to generate this in Firebase Console
        });

        if (token) {
          // Save token to user profile
          await base44.entities.UserProfile.update(userProfile.id, {
            push_token: token
          });

          console.log('Push token saved:', token);
        }

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Message received:', payload);
          
          // Show notification
          if (Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/icon-192.png'
            });
          }
        });
      } catch (error) {
        console.error('Push notification setup failed:', error);
      }
    };

    setupPushNotifications();
  }, [userProfile]);

  return null;
}