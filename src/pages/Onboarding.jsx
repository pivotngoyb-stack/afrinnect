import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Camera, Loader2, Check, Heart,
  Globe, Users, Shield, Sparkles, MapPin, Crown, Gift
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import Logo from '@/components/shared/Logo';
import AfricanPattern from '@/components/shared/AfricanPattern';
import SafetyEducationModal from '@/components/safety/SafetyEducationModal';
import { useConversionTracker, CONVERSION_EVENTS } from '@/components/shared/ConversionTracker';
import { useLanguage } from '@/components/i18n/LanguageContext';

const AFRICAN_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia', 'Egypt', 'Morocco',
  'Tanzania', 'Uganda', 'DR Congo', 'Cameroon', 'Ivory Coast', 'Senegal',
  'Zimbabwe', 'Rwanda', 'Angola', 'Mali', 'Burkina Faso', 'Niger', 'Guinea',
  'Algeria', 'Tunisia', 'Libya', 'Somalia', 'Eritrea', 'Djibouti'
];

const RESIDENCE_COUNTRIES = [
  'Afghanistan', 'Albania', 'Andorra', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Brunei', 'Bulgaria',
  'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Dominica', 'Dominican Republic',
  'Ecuador', 'El Salvador', 'Estonia',
  'Fiji', 'Finland', 'France',
  'Georgia', 'Germany', 'Greece', 'Grenada', 'Guatemala', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Maldives', 'Malta', 'Marshall Islands', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Myanmar',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Saudi Arabia', 'Serbia', 'Seychelles', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'South Korea', 'Spain', 'Sri Lanka', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Tonga', 'Trinidad and Tobago', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'UAE', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'USA', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Other'
].sort();

const ALL_COUNTRIES = [
  ...AFRICAN_COUNTRIES,
  'USA', 'United Kingdom', 'France', 'Canada', 'Germany', 'Brazil',
  'Jamaica', 'Haiti', 'Netherlands', 'Belgium', 'Italy', 'Spain', 'Australia', 'Other'
];

const INTERESTS = [
  'Travel', 'Music', 'Cooking', 'Dancing', 'Art', 'Sports', 'Reading',
  'Movies', 'Fashion', 'Technology', 'Business', 'Fitness', 'Photography', 'Food'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { trackEvent } = useConversionTracker();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const [showSafetyEducation, setShowSafetyEducation] = useState(false);
  const [formData, setFormData] = useState(() => {
    // Check for referral code, founder code, and ambassador code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const founderCode = urlParams.get('founder') || urlParams.get('code');
    const ambassadorCode = urlParams.get('a') || urlParams.get('ambassador') || urlParams.get('r');
    
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }
    if (founderCode) {
      localStorage.setItem('founder_invite_code', founderCode);
    }
    if (ambassadorCode) {
      localStorage.setItem('ambassador_code', ambassadorCode);
    }

    // Load from localStorage if available
    const saved = localStorage.getItem('onboarding_data');
    const savedRef = localStorage.getItem('referral_code');
    const savedFounderCode = localStorage.getItem('founder_invite_code');
    const savedAmbassadorCode = localStorage.getItem('ambassador_code');
    
    return saved ? { ...JSON.parse(saved), referred_by: savedRef, founder_invite_code: savedFounderCode, ambassador_code: savedAmbassadorCode } : {
      display_name: '',
      referred_by: savedRef || '',
      founder_invite_code: savedFounderCode || '',
      ambassador_code: savedAmbassadorCode || '',
      birth_date: '',
      gender: '',
      looking_for: [],
      photos: [],
      country_of_origin: '',
      current_country: '',
      current_city: '',
      relationship_goal: '',
      interests: [],
      location: { lat: null, lng: null }
    };
  });
  const [isUploading, setIsUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Social proof for conversion
  const [recentSignups] = useState(() => {
    const names = ['Amara', 'Kwame', 'Fatou', 'Kofi', 'Nia', 'Adaeze', 'Jabari', 'Zuri'];
    const cities = ['Atlanta', 'Toronto', 'Houston', 'London', 'Chicago', 'Dallas', 'DMV', 'NYC'];
    return names.slice(0, 3).map((name, i) => ({
      name,
      city: cities[i],
      time: `${Math.floor(Math.random() * 5) + 1} min ago`
    }));
  });

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_data', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user already has profile
        const profiles = await base44.entities.UserProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) {
          navigate(createPageUrl('Home'));
        }
        } catch (e) {
        // Not logged in - redirect to login
        console.log('User not authenticated');
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    checkUser();
  }, [navigate]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleGender = (gender) => {
    setFormData(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(gender)
        ? prev.looking_for.filter(g => g !== gender)
        : [...prev.looking_for, gender]
    }));
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 5 ? [...prev.interests, interest] : prev.interests
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate max size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(t('errors.photoSize'));
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateField('photos', [...formData.photos, file_url]);
      if (!formData.primary_photo) {
        updateField('primary_photo', file_url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(t('errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const createProfileMutation = useMutation({
  mutationFn: async () => {
    // CRITICAL: Check for existing profile (prevent duplicates)
    const existingProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (existingProfiles.length > 0) {
      throw new Error(t('errors.existingProfile'));
    }

      // Get device fingerprint
      const deviceId = navigator.userAgent + '_' + new Date().getTime();
      
      // Check phone number uniqueness if provided
      const phoneNumber = formData.phone_number;
      if (phoneNumber) {
        const phoneCheck = await base44.entities.UserProfile.filter({ phone_number: phoneNumber });
        if (phoneCheck.length >= 2) {
          throw new Error(t('errors.phoneRegistered'));
        }
      }

      // Check account limit (strict 1 account per user_id, allows re-registration after deletion)
      const isAdmin = user?.role === 'admin' || user?.email === 'pivotngoyb@gmail.com';
      if (!isAdmin) {
        const allUserProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (allUserProfiles.length >= 1) {
          throw new Error("You already have an account. Please log in.");
        }
      }

      const response = await base44.functions.invoke('createProfile', {
        ...formData,
        device_id: deviceId,
        device_name: navigator.userAgent.substring(0, 50)
      });

      if (response.data.error) throw new Error(response.data.error);
      
      // Clear saved progress on success
      localStorage.removeItem('onboarding_data');
      
      const profile = response.data.profile;

      // Request push notification permission immediately
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Check if browser supports Firebase messaging
            const { isSupported } = await import('firebase/messaging');
            const supported = await isSupported();
            
            if (supported) {
              // Get FCM token and save it
              const { messaging } = await import('@/components/firebase/firebaseConfig');
              const { getToken } = await import('firebase/messaging');
              
              try {
                const vapidKey = await base44.functions.invoke('getVapidKey');
                const token = await getToken(messaging, { vapidKey: vapidKey.vapid_key });
                
                // Save token to profile
                await base44.functions.invoke('updateUserProfile', { push_token: token });
              } catch (tokenError) {
                console.error('Failed to get FCM token:', tokenError);
              }
            }
          }
        }
      } catch (notifError) {
        console.error('Push notification setup failed:', notifError);
      }

      return profile;
    },
    onSuccess: () => {
      setShowSafetyEducation(true);
    },
    onError: (error) => {
      // Parse and display user-friendly error messages
      let friendlyMessage = "Something went wrong. Please try again.";
      const msg = error.message || '';
      
      if (msg.includes('already exists') || msg.includes('already have')) {
        friendlyMessage = "You already have an account. Redirecting you to login...";
        setTimeout(() => navigate(createPageUrl('Home')), 2000);
      } else if (msg.includes('Phone number')) {
        friendlyMessage = "This phone number is already registered. Please use a different number.";
      } else if (msg.includes('18 years')) {
        friendlyMessage = "You must be at least 18 years old to join.";
      } else if (msg.includes('rejected')) {
        friendlyMessage = "Your profile information couldn't be verified. Please check your details and try again.";
      } else if (msg.includes('Birth date')) {
        friendlyMessage = "Please enter your date of birth to continue.";
      } else if (msg.includes('Unauthorized')) {
        friendlyMessage = "Your session has expired. Please log in again.";
        setTimeout(() => base44.auth.redirectToLogin(window.location.href), 2000);
      } else if (msg && msg !== 'null' && msg !== 'undefined') {
        friendlyMessage = msg;
      }
      
      alert(friendlyMessage);
    }
      });

  const getLocation = async () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // CRITICAL: Check if user is in USA or Canada
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            const addr = data.address || {};
            const country = addr.country;
            const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '';
            const state = addr.state || addr.province || '';
            
            // Only allow USA and Canada (Bypass for Admin)
            const isAdmin = user?.role === 'admin' || user?.email === 'pivotngoyb@gmail.com';
            if (!isAdmin && (!country || (country !== 'United States' && country !== 'Canada' && country !== 'United States of America'))) {
              alert(t('location.notSupported'));
              window.location.href = createPageUrl('Waitlist');
              return;
            }

            // Auto-fill location data
            setFormData(prev => ({
              ...prev,
              location: { lat, lng },
              current_country: country === 'United States of America' ? 'United States' : country,
              current_city: city,
              current_state: state
            }));

          } catch (e) {
            console.error('Location validation failed:', e);
            // Fallback: just save coordinates if reverse geocoding fails
             setFormData(prev => ({
              ...prev,
              location: { lat, lng }
            }));
          }
          setGettingLocation(false);
        },
        (error) => {
          alert(t('location.enableAccess'));
          setGettingLocation(false);
        }
      );
    } else {
      alert(t('location.geoNotSupported'));
      setGettingLocation(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: 
        const nameValid = formData.display_name && formData.display_name.trim().length >= 2;
        const ageValid = formData.birth_date && calculateAge(formData.birth_date) >= 18;
        return nameValid && ageValid;
      case 2: return formData.gender && formData.looking_for.length > 0;
      case 3: 
        const locationValid = formData.country_of_origin && formData.current_country && formData.current_city;
        const geoValid = formData.location.lat && formData.location.lng;
        return locationValid && geoValid;
      case 4: return formData.relationship_goal;
      case 5: return formData.photos.length >= 4;
      case 6: return formData.interests.length >= 3;
      default: return false;
    }
  };

  const progress = ((step) / 6) * 100;

  const steps = [
    // Step 0: Welcome - Enhanced for conversion
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center relative"
    >
      <Logo size="large" />
      <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-2">
        Your Journey Starts Here
      </h1>
      <p className="text-gray-500 text-lg mb-2">
        {t('onboarding.welcome.subtitle')}
      </p>
      
      {/* Social proof */}
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-sm text-green-700 font-medium">147 people signed up today</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-white rounded-xl shadow-sm">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 flex items-center justify-center">
            <Globe size={20} className="text-purple-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">{t('onboarding.welcome.global')}</p>
        </div>
        <div className="text-center p-3 bg-white rounded-xl shadow-sm">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
            <Users size={20} className="text-amber-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">{t('onboarding.welcome.cultural')}</p>
        </div>
        <div className="text-center p-3 bg-white rounded-xl shadow-sm">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
            <Shield size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">{t('onboarding.welcome.safe')}</p>
        </div>
      </div>
      
      {/* Quick stats */}
      <div className="flex justify-center gap-6 mb-6 text-sm">
        <div className="text-center">
          <p className="font-bold text-purple-600">2 min</p>
          <p className="text-gray-500 text-xs">to complete</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-purple-600">100%</p>
          <p className="text-gray-500 text-xs">free to join</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-purple-600">50+</p>
          <p className="text-gray-500 text-xs">countries</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {t('onboarding.welcome.terms')}
      </p>

      {/* Founding Member Code Input */}
      {formData.founder_invite_code ? (
        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200 rounded-full">
              <Crown size={20} className="text-amber-700" />
            </div>
            <div className="text-left">
              <p className="font-bold text-amber-800">Founding Member Code Applied!</p>
              <p className="text-sm text-amber-700">Code: {formData.founder_invite_code}</p>
              <p className="text-xs text-amber-600 mt-1">You'll receive 6 months of Premium free!</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={() => {
              const code = prompt('Enter your Founding Member invite code:');
              if (code) {
                updateField('founder_invite_code', code.toUpperCase());
                localStorage.setItem('founder_invite_code', code.toUpperCase());
              }
            }}
            className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-2 mx-auto"
          >
            <Gift size={16} />
            Have an invite code?
          </button>
        </div>
      )}

      {/* Ambassador/Referral Code Input */}
      {formData.ambassador_code ? (
        <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-300 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-200 rounded-full">
              <Users size={18} className="text-purple-700" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-purple-800 text-sm">Referred by a Creator!</p>
              <p className="text-xs text-purple-600">Code: {formData.ambassador_code}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            onClick={() => {
              const code = prompt('Enter your referral code (from a creator/ambassador):');
              if (code) {
                updateField('ambassador_code', code.toUpperCase());
                localStorage.setItem('ambassador_code', code.toUpperCase());
              }
            }}
            className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 mx-auto"
          >
            <Users size={14} />
            Have a referral code?
          </button>
        </div>
      )}
    </motion.div>,

    // Step 1: Basic Info
    <motion.div
      key="basic"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.basic.title')}</h2>
      <p className="text-gray-500 mb-8">{t('onboarding.basic.subtitle')}</p>

      <div className="space-y-6">
        <div>
          <Label className="text-base">{t('onboarding.basic.firstName')}</Label>
          <Input
            value={formData.display_name}
            onChange={(e) => updateField('display_name', e.target.value)}
            placeholder={t('onboarding.basic.firstNamePlaceholder')}
            className="mt-2 h-12 text-lg"
          />
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              {t('errors.realNameWarning')}
            </p>
          </div>
        </div>

        <div>
          <Label className="text-base">{t('onboarding.basic.birthday')}</Label>
          <Input
            type="date"
            value={formData.birth_date}
            onChange={(e) => updateField('birth_date', e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            className="mt-2 h-12 text-lg"
          />
          <p className="text-xs text-gray-400 mt-2">{t('errors.ageReq')}</p>
          {formData.birth_date && calculateAge(formData.birth_date) < 18 && (
            <p className="text-xs text-red-500 mt-1">{t('errors.ageWarning')}</p>
          )}
        </div>
      </div>
    </motion.div>,

    // Step 2: Gender & Preferences
    <motion.div
      key="gender"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.gender.iAm')}</h2>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {['man', 'woman'].map(gender => (
          <button
            key={gender}
            onClick={() => updateField('gender', gender)}
            className={`p-4 rounded-xl border-2 transition ${
              formData.gender === gender
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-2xl mb-2 block">{gender === 'man' ? '👨' : '👩'}</span>
            <span className={`font-medium capitalize ${formData.gender === gender ? 'text-purple-600' : 'text-gray-700'}`}>
              {gender === 'man' ? t('onboarding.gender.man') : t('onboarding.gender.woman')}
            </span>
          </button>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.gender.lookingFor')}</h2>
      <div className="grid grid-cols-2 gap-3">
        {['man', 'woman'].map(gender => (
          <button
            key={gender}
            onClick={() => toggleGender(gender)}
            className={`p-4 rounded-xl border-2 transition ${
              formData.looking_for.includes(gender)
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-2xl mb-2 block">{gender === 'man' ? '👨' : '👩'}</span>
            <span className={`font-medium capitalize ${formData.looking_for.includes(gender) ? 'text-purple-600' : 'text-gray-700'}`}>
              {gender === 'man' ? t('onboarding.gender.men') : t('onboarding.gender.women')}
            </span>

          </button>
        ))}
      </div>
    </motion.div>,

    // Step 3: Location & Heritage
    <motion.div
      key="location"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.location.title')}</h2>
      <p className="text-gray-500 mb-6">{t('onboarding.location.subtitle')}</p>

      <div className="space-y-6">
        <div>
          <Label className="text-base">{t('onboarding.location.iAm')}</Label>
          <Select value={formData.ethnicity} onValueChange={(v) => updateField('ethnicity', v)}>
            <SelectTrigger className="mt-2 h-12">
              <SelectValue placeholder={t('onboarding.location.iAm')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="african">{t('onboarding.location.african')}</SelectItem>
              <SelectItem value="african_descent">{t('onboarding.location.africanDescent')}</SelectItem>
              <SelectItem value="non_african_interested">{t('onboarding.location.nonAfrican')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-base">
            {formData.ethnicity === 'non_african_interested' ? t('onboarding.location.yourCountry') : t('onboarding.location.heritageCountry')}
          </Label>
          <Select value={formData.country_of_origin} onValueChange={(v) => updateField('country_of_origin', v)}>
            <SelectTrigger className="mt-2 h-12">
              <SelectValue placeholder={t('onboarding.location.selectCountry')} />
            </SelectTrigger>
            <SelectContent>
              {formData.ethnicity === 'non_african_interested' ? (
                <>
                  <SelectItem value="divider" disabled className="font-semibold">── All Countries ──</SelectItem>
                  {RESIDENCE_COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </>
              ) : (
                <>
                  <SelectItem value="divider" disabled className="font-semibold">── African Countries ──</SelectItem>
                  {AFRICAN_COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          {formData.ethnicity === 'non_african_interested' && (
            <p className="text-xs text-purple-600 mt-2">
              {t('onboarding.location.welcome')}
            </p>
          )}
        </div>

        {/* Country selection removed - strictly geolocation based */}
        <div>
           {formData.current_country && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm font-medium text-purple-900">{t('onboarding.location.currentLocation')}:</p>
              <p className="text-lg text-purple-700 font-bold flex items-center gap-2">
                <MapPin size={18} />
                {formData.current_city}, {formData.current_country}
              </p>
            </div>
           )}
        </div>

        {/* City input removed - strictly geolocation based */}

        <div className={`p-4 rounded-xl border-2 ${formData.location.lat ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={24} className={formData.location.lat ? 'text-green-600' : 'text-red-600'} />
              <div>
                <p className="font-semibold text-sm">
                  {formData.location.lat ? t('onboarding.location.locationEnabled') : t('onboarding.location.locationRequired')}
                </p>
                <p className="text-xs text-gray-600">
                  {formData.location.lat 
                    ? t('onboarding.location.locationSuccess') 
                    : t('onboarding.location.locationPrompt')}
                </p>
              </div>
            </div>
            {!formData.location.lat && (
              <Button 
                type="button"
                onClick={getLocation}
                disabled={gettingLocation}
                className="bg-purple-600"
              >
                {gettingLocation ? t('onboarding.location.gettingLocation') : t('onboarding.location.enableButton')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>,

    // Step 4: Relationship Goal
    <motion.div
      key="goal"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.goal.title')}</h2>
      <p className="text-gray-500 mb-8">{t('onboarding.goal.subtitle')}</p>

      <div className="space-y-3">
        {[
          { value: 'dating', emoji: '💕', label: t('onboarding.goal.dating.label'), desc: t('onboarding.goal.dating.desc') },
          { value: 'serious_relationship', emoji: '❤️', label: t('onboarding.goal.serious.label'), desc: t('onboarding.goal.serious.desc') },
          { value: 'marriage', emoji: '💍', label: t('onboarding.goal.marriage.label'), desc: t('onboarding.goal.marriage.desc') },
          { value: 'friendship_community', emoji: '🤝', label: t('onboarding.goal.friendship.label'), desc: t('onboarding.goal.friendship.desc') },
          { value: 'networking', emoji: '🌐', label: 'Networking', desc: 'Professional connections' }
        ].map(goal => (
          <button
            key={goal.value}
            onClick={() => updateField('relationship_goal', goal.value)}
            className={`w-full p-4 rounded-xl border-2 text-left transition ${
              formData.relationship_goal === goal.value
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{goal.emoji}</span>
              <div>
                <span className={`font-medium block ${formData.relationship_goal === goal.value ? 'text-purple-600' : 'text-gray-700'}`}>
                  {goal.label}
                </span>
                <span className="text-sm text-gray-500">{goal.desc}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 5: Photos
    <motion.div
      key="photos"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.photos.title')}</h2>
      <p className="text-gray-500 mb-4">{t('onboarding.photos.subtitle')} ({formData.photos.length}/4)</p>
      <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
        <p className="text-sm text-purple-800">
          💡 <strong>Pro tip:</strong> Keep important details (face, upper body) in the <strong>top half</strong> of your photos for best visibility
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {formData.photos.map((photo, idx) => (
          <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
            <img src={photo} alt="" className="w-full h-full object-cover" />
            {idx === 0 && (
              <Badge className="absolute top-2 left-2 bg-purple-600 text-xs">{t('onboarding.photos.main')}</Badge>
            )}
            {/* Replace/Remove buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="p-2 bg-white rounded-full cursor-pointer hover:bg-gray-100 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      alert(t('errors.photoSize'));
                      return;
                    }
                    setIsUploading(true);
                    base44.integrations.Core.UploadFile({ file })
                      .then(({ file_url }) => {
                        const newPhotos = [...formData.photos];
                        newPhotos[idx] = file_url;
                        updateField('photos', newPhotos);
                        if (idx === 0) updateField('primary_photo', file_url);
                      })
                      .catch(() => alert(t('errors.uploadFailed')))
                      .finally(() => setIsUploading(false));
                  }}
                  className="hidden"
                  disabled={isUploading}
                />
                <Camera size={16} className="text-gray-700" />
              </label>
              <button
                type="button"
                onClick={() => {
                  const newPhotos = formData.photos.filter((_, i) => i !== idx);
                  updateField('photos', newPhotos);
                  if (idx === 0 && newPhotos.length > 0) {
                    updateField('primary_photo', newPhotos[0]);
                  } else if (newPhotos.length === 0) {
                    updateField('primary_photo', '');
                  }
                }}
                className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
              >
                <span className="text-white text-xs font-bold">✕</span>
              </button>
            </div>
          </div>
        ))}
        
        {formData.photos.length < 6 && (
          <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 size={32} className="text-purple-600 animate-spin" />
            ) : (
              <>
                <Camera size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">{t('onboarding.photos.addPhoto')}</span>
              </>
            )}
          </label>
        )}
      </div>
    </motion.div>,

    // Step 6: Interests
    <motion.div
      key="interests"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.interests.title')}</h2>
      <p className="text-gray-500 mb-8">{t('onboarding.interests.subtitle')} ({formData.interests.length}/5)</p>

      <div className="flex flex-wrap gap-3">
        {INTERESTS.map(interest => (
          <Badge
            key={interest}
            variant={formData.interests.includes(interest) ? "default" : "outline"}
            className={`cursor-pointer text-base py-2 px-4 transition ${
              formData.interests.includes(interest)
                ? 'bg-purple-600 text-white'
                : 'hover:bg-purple-50'
            }`}
            onClick={() => toggleInterest(interest)}
          >
            {interest}
          </Badge>
        ))}
      </div>
    </motion.div>
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      {/* Progress Bar - Enhanced with motivation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg">
        {step > 0 && (
          <div className="relative">
            <Progress value={progress} className="h-2 rounded-none" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-600">
              {Math.round(progress)}%
            </div>
          </div>
        )}
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => {
              if (step === 0) {
                if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
                  navigate(createPageUrl('Landing'));
                }
              } else {
                setStep(step - 1);
              }
            }} 
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-700">
              {step === 0 ? 'Get Started' : `Step ${step} of 6`}
            </span>
            {step > 0 && step < 6 && (
              <p className="text-xs text-purple-600 font-medium">
                {step === 1 && "Great start! 🎉"}
                {step === 2 && "You're doing amazing! ✨"}
                {step === 3 && "Halfway there! 🚀"}
                {step === 4 && "Almost done! 💪"}
                {step === 5 && "Last step coming up! 🎯"}
              </p>
            )}
          </div>
          <button 
            onClick={() => {
              if (confirm('Exit onboarding? Your progress will be saved.')) {
                navigate(createPageUrl('Landing'));
              }
            }}
            className="text-sm text-gray-500 hover:text-red-600 transition px-2 py-1"
          >
            Exit
          </button>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-6 pb-32 pt-24">
        <AnimatePresence mode="wait">
          {steps[step]}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Enhanced */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          {/* Social proof ticker */}
          {step > 0 && step < 6 && (
            <div className="mb-3 overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>{recentSignups[step % 3]?.name} from {recentSignups[step % 3]?.city} just signed up</span>
              </div>
            </div>
          )}
          
          <Button
            onClick={() => {
              if (step === 6) {
                createProfileMutation.mutate();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={!canProceed() || createProfileMutation.isPending}
            className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
          >
            {createProfileMutation.isPending ? (
              <Loader2 size={24} className="animate-spin" />
            ) : step === 6 ? (
              <>
                <Sparkles size={20} className="mr-2" />
                {t('onboarding.navigation.startMatching')}
              </>
            ) : (
              <>
                {t('common.continue')}
                <ArrowRight size={20} className="ml-2" />
              </>
            )}
          </Button>
          
          {/* Trust signals */}
          {step === 0 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              🔒 Your data is encrypted • Takes ~2 minutes
            </p>
          )}
        </div>
      </div>

      {/* Safety Education Modal */}
      <SafetyEducationModal
        open={showSafetyEducation}
        onClose={() => setShowSafetyEducation(false)}
        onComplete={() => {
          setShowSafetyEducation(false);
          navigate(createPageUrl('Home'));
        }}
      />
    </div>
  );
}