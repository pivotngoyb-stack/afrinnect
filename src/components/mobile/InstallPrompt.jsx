import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Handle Android/Desktop install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a delay to not be intrusive
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS prompt (simulated since iOS doesn't support beforeinstallprompt)
    if (ios && !localStorage.getItem('installPromptDismissed')) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <div className="bg-white rounded-xl shadow-xl p-4 border border-purple-100">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-amber-500 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                A
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Install Afrinnect</h3>
                <p className="text-sm text-gray-600">
                  {isIOS 
                    ? "Install for the best experience" 
                    : "Add to home screen for quick access"}
                </p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {isIOS ? (
            <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
              <div className="flex items-center gap-2 mb-2">
                1. Tap the <Share size={16} className="text-blue-500" /> Share button
              </div>
              <div className="flex items-center gap-2">
                2. Select <span className="font-semibold flex items-center gap-1"><span className="border border-gray-300 rounded px-1 text-xs">+</span> Add to Home Screen</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={handleInstall}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Download size={16} className="mr-2" />
                Install App
              </Button>
              <Button 
                onClick={handleDismiss}
                variant="outline"
                className="w-full"
              >
                Maybe Later
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}