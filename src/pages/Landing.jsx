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
import { useLanguage } from '@/components/i18n/LanguageContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import { useConversionTracker, CONVERSION_EVENTS } from '@/components/shared/ConversionTracker';
import SEOHead from '@/components/seo/SEOHead';

export default function Landing() {
  const { t } = useLanguage();
  const { trackEvent } = useConversionTracker();

  useEffect(() => {
    trackEvent(CONVERSION_EVENTS.LANDING_VIEW);
  }, []);

  const features = [
    {
      icon: Heart,
      title: t('landing.features.cultural.title'),
      description: t('landing.features.cultural.desc')
    },
    {
      icon: Shield,
      title: t('landing.features.safety.title'),
      description: t('landing.features.safety.desc')
    },
    {
      icon: Globe,
      title: t('landing.features.global.title'),
      description: t('landing.features.global.desc')
    },
    {
      icon: Sparkles,
      title: t('landing.features.smart.title'),
      description: t('landing.features.smart.desc')
    }
  ];

  const stats = [
    { number: "10K+", label: t('landing.stats.members') },
    { number: "50+", label: t('landing.stats.countries') },
    { number: "85%", label: t('landing.stats.matchRate') },
    { number: "4.9★", label: t('landing.stats.rating') }
  ];

  const handleGetStarted = () => {
    trackEvent(CONVERSION_EVENTS.SIGNUP_START);
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    const nextUrl = ref ? createPageUrl('Onboarding') + `?ref=${ref}` : createPageUrl('LegalAcceptance');
    base44.auth.redirectToLogin('https://afrinnect-658a9066.base44.app' + nextUrl);
  };

  return (
    <>
      <SEOHead
        title="Afrinnect - Connect with African Singles Worldwide"
        description="Find meaningful relationships with African singles and diaspora worldwide. Join 10K+ members in 50+ countries for cultural dating based on shared heritage."
        keywords="african dating, black dating, african singles, diaspora dating, african culture, ethnic dating"
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-amber-900 relative overflow-hidden">
        <AfricanPattern className="text-white" opacity={0.08} />

      {/* Navigation */}
      <nav className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="default" />
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button 
              onClick={handleGetStarted}
              variant="ghost" 
              className="text-white hover:bg-white/20"
            >
              {t('landing.login')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Large Logo Display */}
          <div className="mb-8">
            <div className="flex justify-center">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/f08d25426_ChatGPTImageDec16202511_09_07AM.png"
                alt="Afrinnect"
                className="h-40 md:h-56 w-auto"
              />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {t('landing.title')}<br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              {t('landing.titleHighlight')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-12 py-6 text-lg rounded-full shadow-2xl"
            >
              {t('landing.getStarted')}
              <ArrowRight size={24} className="ml-2" />
            </Button>
            <p className="text-white/80 text-sm">
              🔐 {t('landing.signInWith')}
            </p>
            <p className="text-white/70 text-xs">
              {t('landing.joinThousands')}
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
              {t('landing.whyChoose')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('landing.whySubtitle')}
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
              {t('landing.howItWorks')}
            </h2>
          </div>

          <div className="space-y-12">
            {[
              { step: "1", title: t('landing.steps.step1.title'), desc: t('landing.steps.step1.desc') },
              { step: "2", title: t('landing.steps.step2.title'), desc: t('landing.steps.step2.desc') },
              { step: "3", title: t('landing.steps.step3.title'), desc: t('landing.steps.step3.desc') },
              { step: "4", title: t('landing.steps.step4.title'), desc: t('landing.steps.step4.desc') }
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
            <span className="font-semibold">{t('landing.premium.subtitle')}</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t('landing.premium.title')}
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
          <p className="text-xl text-gray-600 mb-2">{t('landing.premium.price')}</p>
          <p className="text-sm text-gray-500">{t('landing.premium.africaPrice')}</p>
          </div>
          </section>

      {/* CTA Section */}
      <section className="relative z-10 bg-gradient-to-r from-purple-900 to-amber-900 py-20">
        <AfricanPattern className="text-white" opacity={0.05} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              className="bg-white text-purple-900 hover:bg-gray-100 px-12 py-6 text-lg rounded-full shadow-2xl"
            >
              {t('landing.getStarted')}
              <ArrowRight size={24} className="ml-2" />
            </Button>
            <p className="text-white/80 text-sm">
              {t('landing.cta.freeToJoin')}
            </p>
          </div>
        </div>
        </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Logo size="default" />
          <p className="text-gray-400 mt-4">
            {t('landing.footer.tagline')}
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
            <Link to={createPageUrl('Privacy')} className="hover:text-white">{t('landing.footer.privacy')}</Link>
            <Link to={createPageUrl('Terms')} className="hover:text-white">{t('landing.footer.terms')}</Link>
            <Link to={createPageUrl('CommunityGuidelines')} className="hover:text-white">{t('landing.footer.guidelines')}</Link>
          </div>
          {/* Copyright Notice */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-400">© 2025 Afrinnect. All rights reserved.</p>
            <p className="text-xs text-gray-500 mt-2">
              Afrinnect and the Afrinnect logo are trademarks of Afrinnect. Unauthorized use is prohibited.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}