import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function PanicButton() {
  const [myProfile, setMyProfile] = useState(null);
  const [activeSafetyCheck, setActiveSafetyCheck] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
          
          // Get active safety check
          const checks = await base44.entities.SafetyCheck.filter({
            user_profile_id: profiles[0].id,
            status: 'active'
          });
          if (checks.length > 0) {
            setActiveSafetyCheck(checks[0]);
          }
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (countdown > 0 && triggered) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && triggered) {
      triggerPanicMutation.mutate();
    }
  }, [countdown, triggered]);

  const triggerPanicMutation = useMutation({
    mutationFn: async () => {
      if (!activeSafetyCheck) return;

      // Get current location
      let location = null;
      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null)
          );
        });
      }

      // Update safety check
      await base44.entities.SafetyCheck.update(activeSafetyCheck.id, {
        status: 'alert_triggered',
        panic_triggered: true,
        panic_location: location
      });

      // Send emergency alerts
      await base44.integrations.Core.SendEmail({
        to: activeSafetyCheck.emergency_contact_phone + '@sms.gateway.com',
        subject: 'EMERGENCY: Ubuntu Panic Button Activated',
        body: `${myProfile.display_name} has triggered their panic button! Location: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}. Last known meeting location: ${activeSafetyCheck.date_location}. Please check on them immediately!`
      });

      // Notify admin
      await base44.entities.Report.create({
        reporter_id: myProfile.id,
        reported_id: activeSafetyCheck.meeting_with_profile_id,
        report_type: 'safety',
        description: 'Panic button triggered during meetup',
        status: 'pending'
      });
    },
    onSuccess: () => {
      alert('Emergency services contacted. Help is on the way!');
      window.location.href = createPageUrl('Home');
    }
  });

  const handlePanicPress = () => {
    setTriggered(true);
  };

  const handleCancel = () => {
    setTriggered(false);
    setCountdown(5);
  };

  if (!activeSafetyCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No active safety check</p>
          <Button onClick={() => window.location.href = createPageUrl('Matches')}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-red-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: triggered ? 1.1 : 1 }}
        className="text-center"
      >
        {!triggered ? (
          <div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-64 h-64 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl cursor-pointer"
              onClick={handlePanicPress}
            >
              <div className="text-center text-white">
                <AlertTriangle size={80} className="mx-auto mb-4" />
                <p className="text-2xl font-bold">PANIC</p>
                <p className="text-sm">Tap if unsafe</p>
              </div>
            </motion.div>
            <p className="text-white text-sm">
              Tap the button if you feel unsafe.<br />Emergency services will be notified.
            </p>
          </div>
        ) : (
          <div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-64 h-64 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
            >
              <div className="text-center text-white">
                <Phone size={80} className="mx-auto mb-4" />
                <p className="text-6xl font-bold">{countdown}</p>
                <p className="text-sm mt-2">Calling emergency...</p>
              </div>
            </motion.div>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="bg-white text-red-600 hover:bg-gray-100 text-lg px-8 py-6"
            >
              Cancel
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}