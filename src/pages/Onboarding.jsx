import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Camera, Loader2, Check, Heart,
  Globe, Users, Shield, Sparkles, MapPin
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
  const { trackEvent } = useConversionTracker();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const [showSafetyEducation, setShowSafetyEducation] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
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
  });
  const [isUploading, setIsUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user already has profile
        const profiles = await base44.entities.UserProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        // Not logged in - stay on loading, will be handled by Base44
        console.log('User not authenticated');
      }
    };
    checkUser();
  }, []);

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
      alert('Photo must be less than 10MB');
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
      alert('Upload failed. Please try a smaller photo or different format.');
    } finally {
      setIsUploading(false);
    }
  };

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      // CRITICAL: Check for existing profile (prevent duplicates)
      const existingProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (existingProfiles.length > 0) {
        throw new Error('You already have a profile. Redirecting to home...');
      }

      // Get device fingerprint
      const deviceId = navigator.userAgent + '_' + new Date().getTime();
      
      // Check phone number uniqueness if provided
      const phoneNumber = formData.phone_number;
      if (phoneNumber) {
        const phoneCheck = await base44.entities.UserProfile.filter({ phone_number: phoneNumber });
        if (phoneCheck.length >= 2) {
          throw new Error('This phone number is already registered on 2 devices. Maximum 2 devices per phone number.');
        }
      }

      // Check device limit (max 2 devices per email)
      const allUserProfiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      if (allUserProfiles.length >= 2) {
        throw new Error('Maximum 2 devices allowed per email. Please remove a device first.');
      }

      const profile = await base44.entities.UserProfile.create({
        ...formData,
        user_id: user.id,
        primary_photo: formData.photos[0],
        is_active: true,
        last_active: new Date().toISOString(),
        daily_likes_count: 0,
        daily_likes_reset_date: new Date().toISOString().split('T')[0],
        verification_status: {
          email_verified: true,
          phone_verified: false,
          photo_verified: false,
          id_verified: false
        },
        device_ids: [deviceId],
        device_info: [{
          device_id: deviceId,
          device_name: navigator.userAgent.substring(0, 50),
          last_login: new Date().toISOString()
        }]
      });

      // Request push notification permission immediately
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Get FCM token and save it
            const { messaging } = await import('@/components/firebase/firebaseConfig');
            const { getToken } = await import('firebase/messaging');
            
            try {
              const vapidKey = await base44.functions.invoke('getVapidKey');
              const token = await getToken(messaging, { vapidKey: vapidKey.vapid_key });
              
              // Save token to profile
              await base44.entities.UserProfile.update(profile.id, {
                push_token: token
              });
            } catch (tokenError) {
              console.error('Failed to get FCM token:', tokenError);
            }
          }
        }
      } catch (notifError) {
        console.error('Push notification setup failed:', notifError);
      }

      // Send welcome email
      try {
        await base44.functions.invoke('sendWelcomeEmail', {
          user_email: user.email,
          user_name: formData.display_name
        });
      } catch (e) {
        console.error('Welcome email failed:', e);
      }

      // ANTI-FRAUD: Track referrals with validation
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode && refCode !== profile.id) {
        try {
          // Anti-fraud checks
          const existingReferrals = await base44.asServiceRole.entities.Referral.filter({
            referred_email: user.email
          });
          
          // Prevent duplicate referral credits
          if (existingReferrals.length === 0) {
            // Check if referrer has exceeded limits (max 50 referrals per month)
            const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const referrerStats = await base44.asServiceRole.entities.Referral.filter({
              referrer_profile_id: refCode,
              created_date: { $gte: oneMonthAgo }
            });
            
            if (referrerStats.length < 50) {
              // Valid referral - create record
              await base44.asServiceRole.entities.Referral.create({
                referrer_profile_id: refCode,
                referred_profile_id: profile.id,
                referred_email: user.email,
                conversion_status: 'registered',
                reward_earned: 0,
                device_fingerprint: navigator.userAgent
              });
            } else {
              console.log('Referrer exceeded monthly limit - potential fraud');
            }
          } else {
            console.log('User already referred - preventing duplicate credit');
          }
        } catch (e) {
          console.error('Referral tracking failed:', e);
        }
      }

      return profile;
    },
    onSuccess: () => {
      setShowSafetyEducation(true);
    },
    onError: (error) => {
      alert(error.message);
      if (error.message.includes('already have a profile')) {
        setTimeout(() => {
          window.location.href = createPageUrl('Home');
        }, 2000);
      }
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
            const country = data.address?.country;
            
            // Only allow USA and Canada
            if (!country || (country !== 'United States' && country !== 'Canada' && country !== 'United States of America')) {
              alert('Sorry, Afrinnect is currently only available in the United States and Canada. We\'ll notify you when we expand to your region!');
              setGettingLocation(false);
              return;
            }
          } catch (e) {
            console.error('Location validation failed:', e);
            alert('Unable to verify your location. Please try again.');
            setGettingLocation(false);
            return;
          }
          
          // Save location
          setFormData(prev => ({
            ...prev,
            location: { lat, lng }
          }));
          setGettingLocation(false);
        },
        (error) => {
          alert('Please enable location access to continue. We need your location to find matches near you.');
          setGettingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
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
      case 1: return formData.display_name && formData.birth_date && calculateAge(formData.birth_date) >= 18;
      case 2: return formData.gender && formData.looking_for.length > 0;
      case 3: return formData.country_of_origin && formData.current_country && formData.current_city && formData.location.lat && formData.location.lng;
      case 4: return formData.relationship_goal;
      case 5: return formData.photos.length >= 4;
      case 6: return formData.interests.length >= 3;
      default: return false;
    }
  };

  const progress = ((step) / 6) * 100;

  const steps = [
    // Step 0: Welcome
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <Logo size="large" />
      <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4">
        Welcome to Afrinnect
      </h1>
      <p className="text-gray-500 text-lg mb-8">
        Where African hearts connect worldwide
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
            <Globe size={24} className="text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">Global Community</p>
        </div>
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
            <Users size={24} className="text-amber-600" />
          </div>
          <p className="text-sm text-gray-600">Cultural Connection</p>
        </div>
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
            <Shield size={24} className="text-green-600" />
          </div>
          <p className="text-sm text-gray-600">Safe & Secure</p>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </motion.div>,

    // Step 1: Basic Info
    <motion.div
      key="basic"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's get to know you</h2>
      <p className="text-gray-500 mb-8">What should we call you?</p>

      <div className="space-y-6">
        <div>
          <Label className="text-base">First Name</Label>
          <Input
            value={formData.display_name}
            onChange={(e) => updateField('display_name', e.target.value)}
            placeholder="Your first name"
            className="mt-2 h-12 text-lg"
          />
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              ⚠️ <strong>Use your real name.</strong> Fake names will prevent verification later and may result in account suspension.
            </p>
          </div>
        </div>

        <div>
          <Label className="text-base">Birthday</Label>
          <Input
            type="date"
            value={formData.birth_date}
            onChange={(e) => updateField('birth_date', e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            className="mt-2 h-12 text-lg"
          />
          <p className="text-xs text-gray-400 mt-2">You must be 18+ to use Afrinnect</p>
          {formData.birth_date && calculateAge(formData.birth_date) < 18 && (
            <p className="text-xs text-red-500 mt-1">You must be at least 18 years old</p>
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">I am a...</h2>
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
              {gender}
            </span>
          </button>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Looking for...</h2>
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
              {gender === 'man' ? 'Men' : 'Women'}
            </span>
            {formData.looking_for.includes(gender) && (
              <Check size={18} className="absolute top-2 right-2 text-purple-600" />
            )}
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Heritage</h2>
      <p className="text-gray-500 mb-6">Share your background with us</p>

      <div className="space-y-6">
        <div>
          <Label className="text-base">I am...</Label>
          <Select value={formData.ethnicity} onValueChange={(v) => updateField('ethnicity', v)}>
            <SelectTrigger className="mt-2 h-12">
              <SelectValue placeholder="Select your background" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="african">African (born in Africa)</SelectItem>
              <SelectItem value="african_descent">Of African Descent (diaspora)</SelectItem>
              <SelectItem value="non_african_interested">Interested in African culture/dating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-base">
            {formData.ethnicity === 'non_african_interested' ? 'Your Country' : 'Heritage Country'}
          </Label>
          <Select value={formData.country_of_origin} onValueChange={(v) => updateField('country_of_origin', v)}>
            <SelectTrigger className="mt-2 h-12">
              <SelectValue placeholder="Select country" />
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
              Welcome! Afrinnect connects people worldwide who appreciate African culture ❤️
            </p>
          )}
        </div>

        <div>
          <Label className="text-base">Where do you live now?</Label>
          <Select value={formData.current_country} onValueChange={(v) => updateField('current_country', v)}>
            <SelectTrigger className="mt-2 h-12">
              <SelectValue placeholder="Select your current country" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="sticky top-0 bg-white p-2 border-b">
                <Input
                  placeholder="Type to search..."
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const search = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('[data-country]');
                    items.forEach(item => {
                      const country = item.getAttribute('data-country').toLowerCase();
                      item.style.display = country.includes(search) ? '' : 'none';
                    });
                  }}
                  className="h-9"
                />
              </div>
              {RESIDENCE_COUNTRIES.map(country => (
                <SelectItem key={country} value={country} data-country={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">Search to find your country</p>
        </div>

        <div>
          <Label className="text-base">City</Label>
          <Input
            value={formData.current_city}
            onChange={(e) => updateField('current_city', e.target.value)}
            placeholder="Your city"
            className="mt-2 h-12"
          />
        </div>

        <div className={`p-4 rounded-xl border-2 ${formData.location.lat ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={24} className={formData.location.lat ? 'text-green-600' : 'text-red-600'} />
              <div>
                <p className="font-semibold text-sm">
                  {formData.location.lat ? '✓ Location Enabled' : '⚠️ Location Required'}
                </p>
                <p className="text-xs text-gray-600">
                  {formData.location.lat 
                    ? 'We can now find matches near you' 
                    : 'Tap to enable your location'}
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
                {gettingLocation ? 'Getting...' : 'Enable'}
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What are you looking for?</h2>
      <p className="text-gray-500 mb-8">Be honest - it helps find better matches</p>

      <div className="space-y-3">
        {[
          { value: 'dating', emoji: '💕', label: 'Dating', desc: 'Getting to know someone special' },
          { value: 'serious_relationship', emoji: '❤️', label: 'Serious Relationship', desc: 'Looking for something long-term' },
          { value: 'marriage', emoji: '💍', label: 'Marriage', desc: 'Ready to find a life partner' },
          { value: 'friendship_community', emoji: '🤝', label: 'Friendship/Community', desc: 'Looking to connect and build community' },
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add your photos</h2>
      <p className="text-gray-500 mb-4">Show your best self! Add 4 photos ({formData.photos.length}/4)</p>
      <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
        <p className="text-sm text-purple-800">
          💡 <strong>Pro tip:</strong> Keep important details (face, upper body) in the <strong>top half</strong> of your photos for best visibility
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {formData.photos.map((photo, idx) => (
          <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden">
            <img src={photo} alt="" className="w-full h-full object-cover" />
            {idx === 0 && (
              <Badge className="absolute top-2 left-2 bg-purple-600 text-xs">Main</Badge>
            )}
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
                <span className="text-sm text-gray-500">Add Photo</span>
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Interests</h2>
      <p className="text-gray-500 mb-8">Select at least 3 interests ({formData.interests.length}/5)</p>

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

      {/* Progress Bar */}
      {step > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg">
          <Progress value={progress} className="h-1 rounded-none" />
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setStep(step - 1)} className="p-2">
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <span className="text-sm text-gray-500">Step {step} of 6</span>
            <div className="w-10" />
          </div>
        </div>
      )}

      <main className={`max-w-lg mx-auto px-6 pb-32 ${step > 0 ? 'pt-24' : 'pt-16'}`}>
        <AnimatePresence mode="wait">
          {steps[step]}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={() => {
              if (step === 6) {
                createProfileMutation.mutate();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={!canProceed() || createProfileMutation.isPending}
            className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            {createProfileMutation.isPending ? (
              <Loader2 size={24} className="animate-spin" />
            ) : step === 6 ? (
              <>
                <Sparkles size={20} className="mr-2" />
                Start Matching
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={20} className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Safety Education Modal */}
      <SafetyEducationModal
        open={showSafetyEducation}
        onClose={() => setShowSafetyEducation(false)}
        onComplete={() => {
          setShowSafetyEducation(false);
          window.location.href = createPageUrl('Home');
        }}
      />
    </div>
  );
}