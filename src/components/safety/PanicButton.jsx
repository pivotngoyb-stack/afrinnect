import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Phone, MapPin, Send, Shield, Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PanicButton({ safetyCheckId, myProfile, onPanicTriggered }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [location, setLocation] = useState(null);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  };

  const triggerPanicMutation = useMutation({
    mutationFn: async () => {
      // Update safety check
      await base44.entities.SafetyCheck.update(safetyCheckId, {
        panic_triggered: true,
        panic_location: location,
        status: 'alert_triggered'
      });

      // Send emergency notification (in real app, this would alert authorities/emergency contact)
      const safetyChecks = await base44.entities.SafetyCheck.filter({ id: safetyCheckId });
      const safetyCheck = safetyChecks[0];

      if (safetyCheck?.emergency_contact_phone) {
        await base44.integrations.Core.SendEmail({
          to: myProfile.created_by,
          subject: '🚨 EMERGENCY ALERT - Ubuntu Dating',
          body: `
            EMERGENCY ALERT TRIGGERED
            
            User: ${myProfile.display_name}
            Time: ${new Date().toISOString()}
            Location: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}
            
            Emergency Contact: ${safetyCheck.emergency_contact_name}
            Emergency Phone: ${safetyCheck.emergency_contact_phone}
            
            Meeting Details: ${safetyCheck.date_location}
            
            This is an automated safety alert from Ubuntu Dating.
          `
        });
      }
    },
    onSuccess: () => {
      onPanicTriggered?.();
      setShowConfirm(false);
    }
  });

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          getCurrentLocation();
          setShowConfirm(true);
        }}
        className="fixed bottom-24 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-xl flex items-center justify-center hover:shadow-2xl transition-shadow"
      >
        <Shield size={28} className="text-white" />
      </motion.button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={24} />
              Emergency Alert
            </DialogTitle>
            <DialogDescription>
              This will immediately alert your emergency contact and our safety team.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Only use this button if you're in immediate danger or feel unsafe.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="text-gray-400" />
              <span className="text-gray-600">
                {location ? 'Location detected' : 'Detecting location...'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-gray-400" />
              <span className="text-gray-600">Emergency contact will be notified</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield size={16} className="text-gray-400" />
              <span className="text-gray-600">Our safety team will be alerted</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => triggerPanicMutation.mutate()}
              disabled={triggerPanicMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle size={16} className="mr-2" />
              Trigger Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}