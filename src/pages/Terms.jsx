import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Landing')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Afrinnect Terms of Service</h2>
            <p className="text-sm text-gray-500">Last Updated: January 21, 2026</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">1. Acceptance of Terms</h3>
            <p className="text-gray-700">
              By accessing and using Afrinnect, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">2. Eligibility</h3>
            <p className="text-gray-700">
              You must be at least 18 years old to use Afrinnect. By creating an account, you represent that you are of legal age to form a binding contract.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">3. Account Responsibilities</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You agree to provide accurate, current information in your profile</li>
              <li>You may not impersonate others or create fake profiles</li>
              <li>One person, one account - multiple accounts are prohibited</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">4. Prohibited Conduct</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Harassment, hate speech, or discriminatory behavior</li>
              <li>Sharing explicit content without consent</li>
              <li>Scamming, fraud, or soliciting money</li>
              <li>Promoting illegal activities</li>
              <li>Using the platform for commercial purposes without permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">5. Content Ownership</h3>
            <p className="text-gray-700">
              You retain ownership of content you post. By posting, you grant Afrinnect a license to use, display, and distribute your content on the platform.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">6. Safety and Verification</h3>
            <p className="text-gray-700">
              While we implement safety features including AI moderation and photo verification, Afrinnect is not responsible for the actions of users. Always exercise caution when meeting people in person.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">7. Subscriptions and Payments</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Premium subscriptions automatically renew unless canceled at least 24 hours before the renewal date</li>
              <li>You can cancel anytime from Settings → Subscription & Pricing - cancellation takes effect at the end of your billing period</li>
              <li>For iOS: Manage subscriptions in your Apple ID settings</li>
              <li>For Android: Manage subscriptions in Google Play Store settings</li>
              <li>Prices may change with 30 days notice</li>
              <li>Payment processing is handled securely by Stripe and app store payment systems</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">8. Refund Policy</h3>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="font-semibold text-amber-900 mb-2">Refund Policy</p>
              <p className="text-gray-700 text-sm">
                Subscription purchases are generally non-refundable. We do not typically offer refunds or credits for:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700 text-sm">
                <li>Partial subscription periods</li>
                <li>Unused premium features</li>
                <li>Account terminations or suspensions due to violations</li>
              </ul>
              <p className="text-gray-700 text-sm mt-2">
                <strong>Exceptions:</strong> Refunds may be granted for technical errors that prevented service delivery, duplicate charges, or where required by applicable law. For App Store and Google Play purchases, refund requests should be directed to Apple or Google respectively. Contact support@afrinnect.com for other refund inquiries.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">9. Account Termination & Deletion</h3>
            <p className="text-gray-700">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
              <p className="font-semibold text-blue-900 mb-2">Your Right to Delete Your Account</p>
              <p className="text-gray-700 text-sm">
                You may delete your account at any time through <strong>Settings → Account Deletion</strong>. Upon deletion:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700 text-sm">
                <li>Your profile will be immediately deactivated and hidden from other users</li>
                <li>Your personal data will be anonymized or deleted within 30 days</li>
                <li>Some data may be retained for legal compliance (fraud prevention, legal disputes)</li>
                <li>This action is permanent and cannot be undone</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">10. Limitation of Liability</h3>
            <p className="text-gray-700">
              Afrinnect is provided "as is" without warranties. We are not liable for damages arising from use of the service, interactions with other users, or technical issues.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">11. Changes to Terms</h3>
            <p className="text-gray-700">
              We may modify these terms at any time. Continued use after changes constitutes acceptance of new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">12. Intellectual Property</h3>
            <p className="text-gray-700">
              All content, features, and functionality of Afrinnect, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, data compilations, and software, are the exclusive property of Afrinnect and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-700">
              The Afrinnect name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Afrinnect. You must not use such marks without prior written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">13. Contact</h3>
            <p className="text-gray-700">
              For questions about these terms, contact us at legal@afrinnect.com
            </p>
          </section>

          {/* Copyright Notice */}
          <div className="pt-6 border-t text-center">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} Afrinnect. All rights reserved.</p>
            <p className="text-xs text-gray-500 mt-1">
              Unauthorized reproduction or distribution of this copyrighted work is illegal.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}