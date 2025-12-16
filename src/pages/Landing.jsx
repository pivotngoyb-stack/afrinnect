import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Heart, Shield, Globe, Sparkles, Users, CheckCircle, Crown, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';
import AfricanPattern from '@/components/shared/AfricanPattern';

export default function Landing() {
  // Removed auto-redirect - let users explore the landing page

  const features = [
    {
      icon: Heart,
      title: "Cultural Connection",
      description: "Connect with people who share your heritage and values"
    },
    {
      icon: Shield,
      title: "Safety First",
      description: "AI moderation, photo verification, and panic button for your protection"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Meet the African diaspora worldwide or stay local"
    },
    {
      icon: Sparkles,
      title: "Smart Matching",
      description: "AI-powered compatibility based on culture and values"
    }
  ];

  const stats = [
    { number: "10K+", label: "Active Members" },
    { number: "50+", label: "Countries" },
    { number: "85%", label: "Match Rate" },
    { number: "4.9★", label: "User Rating" }
  ];

  const handleGetStarted = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl('LegalAcceptance'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-amber-900 relative overflow-hidden">
      <AfricanPattern className="text-white" opacity={0.08} />

      {/* Navigation */}
      <nav className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo showText size="large" />
          <Button 
            onClick={handleGetStarted}
            variant="ghost" 
            className="text-white hover:bg-white/20"
          >
            Log In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Find Love Within<br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              Your Culture
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Ubuntu connects the African diaspora worldwide for meaningful relationships rooted in shared heritage and values.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-12 py-6 text-lg rounded-full shadow-2xl"
            >
              Get Started Free
              <ArrowRight size={24} className="ml-2" />
            </Button>
            <p className="text-white/80 text-sm">
              🔐 Sign in with Google • Facebook • Microsoft • or Email
            </p>
            <p className="text-white/70 text-xs">
              Join thousands finding love across 50+ countries
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto"
        >
          {stats.map((stat, idx) => (
            <Card key={idx} className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Ubuntu?
            </h2>
            <p className="text-xl text-gray-600">
              More than just a dating app - it's a cultural experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-amber-100 flex items-center justify-center">
                      <feature.icon size={32} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 bg-gradient-to-br from-purple-50 to-amber-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="space-y-12">
            {[
              { step: "1", title: "Create Your Profile", desc: "Share your story, culture, and what you're looking for" },
              { step: "2", title: "Get Verified", desc: "Complete photo verification for trust and safety" },
              { step: "3", title: "Discover & Connect", desc: "Browse profiles and make meaningful connections" },
              { step: "4", title: "Meet & Date", desc: "Use safety features like check-ins for secure meetings" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="flex items-center gap-6"
              >
                <div className="w-16 h-16 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center text-white text-2xl font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Preview */}
      <section className="relative z-10 bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-2 rounded-full mb-6">
            <Crown size={20} />
            <span className="font-semibold">Premium Features</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Unlock Your Full Potential
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              "Unlimited Likes",
              "Advanced Filters",
              "See Who Likes You",
              "Profile Boosts",
              "Read Receipts",
              "Priority Support"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2 text-gray-700">
                <CheckCircle size={20} className="text-green-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <p className="text-xl text-gray-600 mb-2">Starting at just $9.99/month</p>
          <p className="text-sm text-gray-500">Special pricing for Africa: 50% off</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 bg-gradient-to-r from-purple-900 to-amber-900 py-20">
        <AfricanPattern className="text-white" opacity={0.05} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Find Your Match?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join Ubuntu today and start your journey to meaningful connection
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-white text-purple-900 hover:bg-gray-100 px-12 py-6 text-lg rounded-full shadow-2xl"
            >
              Get Started Free
              <ArrowRight size={24} className="ml-2" />
            </Button>
            <p className="text-white/80 text-sm">
              Free to join • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Logo showText size="default" />
          <p className="text-gray-400 mt-4">
            © 2025 Ubuntu. Connecting hearts across cultures.
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
            <Link to={createPageUrl('Privacy')} className="hover:text-white">Privacy Policy</Link>
            <Link to={createPageUrl('Terms')} className="hover:text-white">Terms of Service</Link>
            <Link to={createPageUrl('CommunityGuidelines')} className="hover:text-white">Community Guidelines</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}