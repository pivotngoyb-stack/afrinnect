import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Landing')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Afrinnect Privacy Policy</h2>
            <p className="text-sm text-gray-500">Last Updated: December 16, 2025</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">1. Information We Collect</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Profile Information:</strong> Name, age, photos, location, interests, and preferences</li>
              <li><strong>Account Data:</strong> Email address, phone number (if verified)</li>
              <li><strong>Usage Data:</strong> How you use the app, profiles viewed, matches made</li>
              <li><strong>Device Information:</strong> Device type, operating system, IP address</li>
              <li><strong>Location Data:</strong> With your permission, to show nearby matches</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">2. How We Use Your Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>To provide and improve our dating service</li>
              <li>To match you with compatible users</li>
              <li>To verify your identity and ensure safety</li>
              <li>To send you notifications about matches and messages</li>
              <li>To analyze usage patterns and improve features</li>
              <li>To prevent fraud and enforce our terms</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">3. Information Sharing</h3>
            <p className="text-gray-700">We share your information with:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Other Users:</strong> Profile information visible to potential matches</li>
              <li><strong>Service Providers:</strong> Cloud hosting, payment processors, analytics</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect safety</li>
              <li><strong>We NEVER sell your data to third parties</strong></li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">4. Data Security</h3>
            <p className="text-gray-700">
              We implement industry-standard security measures including encryption, secure servers, and regular security audits. However, no system is 100% secure.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">5. Your Rights</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Control who sees your profile</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">6. Data Retention</h3>
            <p className="text-gray-700">
              We retain your data while your account is active. After deletion, we keep minimal information for legal compliance and safety (30 days), then permanently delete.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">7. Children's Privacy</h3>
            <p className="text-gray-700">
              Afrinnect is only for users 18+. We do not knowingly collect information from minors. If we discover a minor's account, we immediately delete it.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">8. International Data Transfers</h3>
            <p className="text-gray-700">
              Your data may be processed in countries outside your residence. We ensure appropriate safeguards are in place.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">9. Cookies and Tracking</h3>
            <p className="text-gray-700">
              We use cookies for authentication, preferences, and analytics. You can control cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">10. Changes to Privacy Policy</h3>
            <p className="text-gray-700">
              We may update this policy. You'll be notified of significant changes via email or app notification.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">11. Contact Us</h3>
            <p className="text-gray-700">
              Questions about privacy? Email privacy@afrinnect.com
            </p>
          </section>

          {/* Copyright Notice */}
          <div className="pt-6 border-t text-center">
            <p className="text-sm text-gray-600">© 2025 Afrinnect. All rights reserved.</p>
            <p className="text-xs text-gray-500 mt-1">
              This document and all content are protected by copyright law.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}