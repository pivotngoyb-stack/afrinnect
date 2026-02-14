import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Shield, Globe, Sparkles, Users, CheckCircle, Crown, ArrowRight, Star, MessageCircle, Download } from 'lucide-react';
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
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    trackEvent(CONVERSION_EVENTS.LANDING_VIEW);
    // Check login status
    base44.auth.isAuthenticated().then(setIsLoggedIn).catch(() => {});
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
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
    { number: "10K+", label: t('landing.stats.members'), disclaimer: true },
    { number: "50+", label: t('landing.stats.countries'), disclaimer: true },
    { number: "85%", label: t('landing.stats.matchRate'), disclaimer: true },
    { number: "4.9★", label: t('landing.stats.rating'), disclaimer: true }
  ];

  const testimonials = [
    {
      name: "Amara & Kwame",
      location: "Nigeria → USA",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/b55b7c66d_image.png",
      quote: "We found each other across continents. Afrinnect helped us connect through our shared Igbo heritage. Now we're planning our traditional wedding!",
      rating: 5
    },
    {
      name: "Zara & Malik",
      location: "Kenya → UK",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/b55b7c66d_image.png",
      quote: "Meeting someone who truly understands my culture was priceless. We bonded over our love for East African music and food.",
      rating: 5
    },
    {
      name: "Thandiwe & David",
      location: "South Africa → Canada",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/b55b7c66d_image.png",
      quote: "Afrinnect's AI matching is incredible! We matched at 94% compatibility and it showed - we've been together 2 years now.",
      rating: 5
    }
  ];

  const communityPhotos = [
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/e32885cab_o1ocuxst.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/61126ff23_premium_photo-1661281273104-150484122d32.jpg",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/0129c1998_ai-generated-8702314_1280.jpg",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/b55b7c66d_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/728ada3a8_image.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/3face4563_image.png"
  ];

  const handleGetStarted = () => {
    window.location.href = createPageUrl('Onboarding');
  };

  const handleLogin = async () => {
    trackEvent(CONVERSION_EVENTS.SIGNUP_START);
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    const nextUrl = ref ? createPageUrl('Home') + `?ref=${ref}` : createPageUrl('Home');
    base44.auth.redirectToLogin(window.location.origin + nextUrl);
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
          <div className="relative group cursor-pointer">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter transform -skew-x-6 transition-all duration-300 group-hover:skew-x-0">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]" style={{ WebkitTextStroke: '1px white' }}>
                AFRINNECT
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {isLoggedIn ? (
              <Link to={createPageUrl('Home')}>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/20 font-semibold"
                >
                  Go to App →
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={handleLogin}
                variant="ghost" 
                className="text-white hover:bg-white/20"
              >
                {t('landing.login')}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            {/* Logo */}
            <div className="mb-8">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/539bcd82a_EA8B1C93-B120-4D4F-A79F-9725395A9A37.png"
                alt="Afrinnect"
                className="h-24 md:h-32 w-auto"
              />
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              {t('landing.title')}<br />
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                {t('landing.titleHighlight')}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
              {t('landing.subtitle')}
            </p>
            
            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {isLoggedIn ? (
                <Link to={createPageUrl('Home')}>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-10 py-6 text-lg rounded-full shadow-2xl"
                  >
                    Welcome Back! Go to App
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Button 
                    onClick={handleGetStarted}
                    size="lg" 
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-10 py-6 text-lg rounded-full shadow-2xl"
                  >
                    {t('landing.getStarted')}
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                  <Button 
                    onClick={handleLogin}
                    size="lg" 
                    variant="outline"
                    className="bg-white/10 backdrop-blur-lg border-white/30 text-white hover:bg-white/20 px-10 py-6 text-lg rounded-full"
                  >
                    {t('landing.login')}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                <span>Free to Join</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                <span>10K+ Members</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Photo Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Main large image */}
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/0129c1998_ai-generated-8702314_1280.jpg"
                alt="African community"
                className="w-full h-[500px] md:h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex -space-x-3">
                    {communityPhotos.slice(0, 4).map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt=""
                        className="w-10 h-10 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">+10,000 members</span>
                </div>
                <p className="text-lg font-semibold">Find your perfect match today</p>
              </div>
            </div>

            {/* Floating cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -left-8 top-12 z-20 bg-white rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/728ada3a8_image.png"
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-bold text-gray-900 text-sm">New Match! 💕</p>
                  <p className="text-xs text-gray-500">Kwame from Ghana</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="absolute -right-8 bottom-24 z-20 bg-white rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/728ada3a8_image.png"
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-bold text-gray-900 text-sm">94% Match 🎯</p>
                  <p className="text-xs text-gray-500">Zara from Kenya</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
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
        <p className="text-center text-white/40 text-xs mt-4">
          *Statistics are approximate and subject to change
        </p>
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

      {/* Success Stories */}
      <section className="relative z-10 bg-gradient-to-br from-purple-50 to-amber-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Real Love Stories
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands who found love through Afrinnect
            </p>
          </div>

          {/* Testimonial Carousel */}
          <div className="max-w-4xl mx-auto mb-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-white shadow-xl">
                  <CardContent className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <img
                        src={testimonials[activeTestimonial].image}
                        alt={testimonials[activeTestimonial].name}
                        className="w-32 h-32 rounded-full object-cover shadow-lg"
                      />
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-1 mb-3">
                          {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                            <Star key={i} size={20} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-lg text-gray-700 mb-4 italic">
                          "{testimonials[activeTestimonial].quote}"
                        </p>
                        <p className="font-bold text-gray-900">
                          {testimonials[activeTestimonial].name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {testimonials[activeTestimonial].location}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`w-3 h-3 rounded-full transition ${
                    idx === activeTestimonial ? 'bg-purple-600 w-8' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Featured Members */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Meet Our Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/3a1a2d64b_hf_20260205_233951_9c93cfee-36d8-40bf-b74c-aa7d976a55e6.png",
                "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/d7dbbca92_hf_20260205_233951_f5202b10-c373-421f-a6a5-526594516b69.png",
                "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/9010d2015_hf_20260205_043404_dec0a2af-faf2-4bb2-a530-2294bac33faa.png"
              ].map((photo, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  viewport={{ once: true }}
                  className="rounded-3xl overflow-hidden shadow-2xl hover:scale-105 transition-transform duration-300"
                >
                  <img
                    src={photo}
                    alt={`Featured member ${idx + 1}`}
                    className="w-full h-[400px] md:h-[450px] object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Community Photo Grid */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {communityPhotos.map((photo, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-transform"
              >
                <img
                  src={photo}
                  alt={`Community member ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('landing.howItWorks')}
            </h2>
            <p className="text-xl text-gray-600">Getting started is simple</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { 
                step: "1", 
                title: t('landing.steps.step1.title'), 
                desc: t('landing.steps.step1.desc'),
                icon: Users,
                image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/e32885cab_o1ocuxst.png"
              },
              { 
                step: "2", 
                title: t('landing.steps.step2.title'), 
                desc: t('landing.steps.step2.desc'),
                icon: Sparkles,
                image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/65fc6c0a5_medium-shot-beautiful-african-woman-posing.jpg"
              },
              { 
                step: "3", 
                title: t('landing.steps.step3.title'), 
                desc: t('landing.steps.step3.desc'),
                icon: MessageCircle,
                image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/61126ff23_premium_photo-1661281273104-150484122d32.jpg"
              },
              { 
                step: "4", 
                title: t('landing.steps.step4.title'), 
                desc: t('landing.steps.step4.desc'),
                icon: Heart,
                image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6940c70dbf312aa4658a9066/e32885cab_o1ocuxst.png"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute -bottom-6 left-6 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        {item.step}
                      </div>
                    </div>
                    <div className="p-6 pt-10">
                      <div className="w-10 h-10 mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                        <item.icon size={20} className="text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
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
              "See Who Likes You",
              "Advanced Filters",
              "Read Receipts",
              "Rewind Last Swipe",
              "Profile Boosts"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2 text-gray-700">
                <CheckCircle size={20} className="text-green-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

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

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-gray-900 text-sm">Get the App</p>
            <p className="text-xs text-gray-500">Better experience on mobile</p>
          </div>
          {isLoggedIn ? (
            <Link to={createPageUrl('Home')}>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6">
                Open App
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={handleGetStarted}
              size="sm" 
              className="bg-gradient-to-r from-purple-600 to-amber-600 text-white rounded-full px-6"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900 text-white py-12 pb-32 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Logo size="default" />
          <p className="text-gray-400 mt-4">
            {t('landing.footer.tagline')}
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
            <Link to={createPageUrl('Privacy')} className="hover:text-white" id="privacy-policy">Privacy Policy</Link>
            <Link to={createPageUrl('Terms')} className="hover:text-white">Terms of Service</Link>
            <Link to={createPageUrl('CommunityGuidelines')} className="hover:text-white">{t('landing.footer.guidelines')}</Link>
          </div>
          {/* Contact & Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-400 mb-2">
              Contact us: <a href="mailto:Support@afrinnect.com" className="text-amber-400 hover:text-amber-300">Support@afrinnect.com</a>
            </p>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} Afrinnect. All rights reserved.</p>
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