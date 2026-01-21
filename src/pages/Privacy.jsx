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
            <p className="text-sm text-gray-500">Last Updated: January 21, 2026</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">1. Information We Collect</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Profile Information:</strong> Name, age, photos, location, interests, and preferences</li>
              <li><strong>Account Data:</strong> Email address, phone number (if verified)</li>
              <li><strong>Third-Party Accounts:</strong> If you sign in with Google, Facebook, or other providers, we access basic profile info (Name, Email, Photo) authorized by you.</li>
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
            <h3 className="text-xl font-semibold">5. Your Rights (GDPR & Africa Compliance)</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 font-medium mb-2">✅ Your Data Rights Include:</p>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Right to Access:</strong> Request a copy of all your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate information</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Delete your account and data permanently</li>
              <li><strong>Right to Data Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> Opt-out of marketing communications</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Withdraw Consent:</strong> Control who sees your profile</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              To exercise these rights, contact privacy@afrinnect.com. We respond within 30 days.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">6. Data Retention</h3>
            <p className="text-gray-700">
              We retain your data while your account is active. After account deletion:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-2">
              <li>Profile data is anonymized immediately</li>
              <li>Personal identifiers are deleted within 30 days</li>
              <li>Some data may be retained for legal compliance, fraud prevention, or safety (up to 7 years for financial records)</li>
              <li>Aggregated, anonymized analytics data may be retained indefinitely</li>
            </ul>
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
              Your data may be processed in countries outside your residence (EU, USA, Africa). We ensure appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Standard Contractual Clauses (SCCs) for GDPR compliance</li>
              <li>African Union Data Protection Convention alignment</li>
              <li>Encryption in transit and at rest</li>
              <li>ISO 27001-compliant data centers</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">9. Cookies and Tracking</h3>
            <p className="text-gray-700">
              We use cookies for authentication, preferences, and analytics. You can control cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">10. California Privacy Rights (CCPA)</h3>
            <p className="text-gray-700">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Right to Know:</strong> Request what personal information we collect, use, and disclose</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> We do not sell personal information</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              To exercise your CCPA rights, email privacy@afrinnect.com with "CCPA Request" in the subject line.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">11. Changes to Privacy Policy</h3>
            <p className="text-gray-700">
              We may update this policy. You'll be notified of significant changes via email or app notification.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">12. Contact Us</h3>
            <p className="text-gray-700">
              Questions about privacy? Email privacy@afrinnect.com
            </p>
          </section>

          {/* Copyright Notice */}
          <div className="pt-6 border-t text-center">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} Afrinnect. All rights reserved.</p>
            <p className="text-xs text-gray-500 mt-1">
              This document and all content are protected by copyright law.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}