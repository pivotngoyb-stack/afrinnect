import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Shield, FileText, Users, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';

export default function LegalAcceptance() {
  const [user, setUser] = useState(null);
  const [accepted, setAccepted] = useState({
    terms: false,
    privacy: false,
    guidelines: false
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if already accepted
        const acceptances = await base44.entities.LegalAcceptance.filter({ user_id: currentUser.id });
        if (acceptances.length > 0) {
          window.location.href = createPageUrl('Onboarding');
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    checkUser();
  }, []);

  const handleAccept = async () => {
    if (!accepted.terms || !accepted.privacy || !accepted.guidelines) {
      alert('Please accept all agreements to continue');
      return;
    }

    await base44.entities.LegalAcceptance.create({
      user_id: user.id,
      terms_accepted: true,
      privacy_accepted: true,
      guidelines_accepted: true,
      accepted_at: new Date().toISOString()
    });

    window.location.href = createPageUrl('Onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-amber-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <Logo showText size="large" />
          <h1 className="text-3xl font-bold text-white mt-4 mb-2">Welcome to Ubuntu</h1>
          <p className="text-white/80">Before we begin, please review and accept our policies</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl">
                <Checkbox
                  id="terms"
                  checked={accepted.terms}
                  onCheckedChange={(checked) => setAccepted(prev => ({ ...prev, terms: checked }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={20} className="text-amber-400" />
                    <label htmlFor="terms" className="font-semibold text-white cursor-pointer">
                      Terms of Service
                    </label>
                  </div>
                  <p className="text-sm text-white/70 mb-2">
                    Our rules for using Ubuntu, including account responsibilities and prohibited conduct.
                  </p>
                  <Link to={createPageUrl('Terms')} target="_blank">
                    <Button variant="link" className="text-amber-400 p-0 h-auto">
                      Read Full Terms →
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl">
                <Checkbox
                  id="privacy"
                  checked={accepted.privacy}
                  onCheckedChange={(checked) => setAccepted(prev => ({ ...prev, privacy: checked }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={20} className="text-green-400" />
                    <label htmlFor="privacy" className="font-semibold text-white cursor-pointer">
                      Privacy Policy
                    </label>
                  </div>
                  <p className="text-sm text-white/70 mb-2">
                    How we collect, use, and protect your personal information and data.
                  </p>
                  <Link to={createPageUrl('Privacy')} target="_blank">
                    <Button variant="link" className="text-green-400 p-0 h-auto">
                      Read Privacy Policy →
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/10 rounded-xl">
                <Checkbox
                  id="guidelines"
                  checked={accepted.guidelines}
                  onCheckedChange={(checked) => setAccepted(prev => ({ ...prev, guidelines: checked }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={20} className="text-blue-400" />
                    <label htmlFor="guidelines" className="font-semibold text-white cursor-pointer">
                      Community Guidelines
                    </label>
                  </div>
                  <p className="text-sm text-white/70 mb-2">
                    Standards for respectful behavior and safety in our community.
                  </p>
                  <Link to={createPageUrl('CommunityGuidelines')} target="_blank">
                    <Button variant="link" className="text-blue-400 p-0 h-auto">
                      Read Guidelines →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAccept}
              disabled={!accepted.terms || !accepted.privacy || !accepted.guidelines}
              className="w-full py-6 text-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              <CheckCircle size={20} className="mr-2" />
              I Accept - Continue
            </Button>

            <p className="text-center text-white/60 text-xs">
              By continuing, you confirm you're 18+ and agree to these policies
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}