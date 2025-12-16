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
            <h2 className="text-2xl font-bold mb-2">Ubuntu Terms of Service</h2>
            <p className="text-sm text-gray-500">Last Updated: December 16, 2025</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">1. Acceptance of Terms</h3>
            <p className="text-gray-700">
              By accessing and using Ubuntu, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">2. Eligibility</h3>
            <p className="text-gray-700">
              You must be at least 18 years old to use Ubuntu. By creating an account, you represent that you are of legal age to form a binding contract.
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
              You retain ownership of content you post. By posting, you grant Ubuntu a license to use, display, and distribute your content on the platform.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">6. Safety and Verification</h3>
            <p className="text-gray-700">
              While we implement safety features including AI moderation and photo verification, Ubuntu is not responsible for the actions of users. Always exercise caution when meeting people in person.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">7. Subscriptions and Payments</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Premium subscriptions automatically renew unless canceled</li>
              <li>Refunds are available within 14 days of purchase</li>
              <li>Prices may change with 30 days notice</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">8. Account Termination</h3>
            <p className="text-gray-700">
              We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through settings.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">9. Limitation of Liability</h3>
            <p className="text-gray-700">
              Ubuntu is provided "as is" without warranties. We are not liable for damages arising from use of the service, interactions with other users, or technical issues.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">10. Changes to Terms</h3>
            <p className="text-gray-700">
              We may modify these terms at any time. Continued use after changes constitutes acceptance of new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold">11. Contact</h3>
            <p className="text-gray-700">
              For questions about these terms, contact us at legal@ubuntu-dating.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}