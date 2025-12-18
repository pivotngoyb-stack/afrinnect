import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, X, Loader2, Save, Check, Sparkles,
  MapPin, Briefcase, GraduationCap, Heart, Globe, Users, Award
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AfricanPattern from '@/components/shared/AfricanPattern';

const AFRICAN_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia', 'Egypt', 'Morocco',
  'Tanzania', 'Uganda', 'DR Congo', 'Cameroon', 'Ivory Coast', 'Senegal',
  'Zimbabwe', 'Rwanda', 'Angola', 'Mali', 'Burkina Faso', 'Niger', 'Guinea',
  'Zambia', 'Malawi', 'Somalia', 'Chad', 'Tunisia', 'Botswana', 'Namibia'
];

const ALL_COUNTRIES = [
  ...AFRICAN_COUNTRIES,
  'USA', 'United Kingdom', 'France', 'Canada', 'Germany', 'Brazil',
  'Jamaica', 'Haiti', 'Trinidad and Tobago', 'Netherlands', 'Belgium',
  'Italy', 'Spain', 'Portugal', 'Australia', 'Other'
];

const LANGUAGES = [
  'English', 'French', 'Swahili', 'Arabic', 'Yoruba', 'Hausa', 'Igbo',
  'Amharic', 'Zulu', 'Portuguese', 'Lingala', 'Wolof', 'Twi', 'Shona',
  'Somali', 'Tigrinya', 'Berber', 'Afrikaans', 'Other'
];

const INTERESTS = [
  'Travel', 'Music', 'Cooking', 'Dancing', 'Art', 'Sports', 'Reading',
  'Movies', 'Fashion', 'Technology', 'Business', 'Fitness', 'Photography',
  'Gaming', 'Nature', 'Volunteering', 'Spirituality', 'Food'
];

const CULTURAL_VALUES = [
  'Family First', 'Respect for Elders', 'Community', 'Faith', 'Education',
  'Hard Work', 'Hospitality', 'Cultural Pride', 'Tradition', 'Ubuntu',
  'Generosity', 'Resilience', 'Loyalty', 'Honor'
];

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeSection, setActiveSection] = useState('photos');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        window.location.href = createPageUrl('Landing');
        return;
      }

      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (profiles.length === 0) {
        window.location.href = createPageUrl('Onboarding');
        return;
      }
      
      const p = profiles[0];
      setProfile(p);
      setFormData({
        display_name: p.display_name || '',
        bio: p.bio || '',
        birth_date: p.birth_date || '',
        gender: p.gender || '',
        photos: p.photos || [],
        primary_photo: p.primary_photo || '',
        country_of_origin: p.country_of_origin || '',
        current_country: p.current_country || '',
        current_city: p.current_city || '',
        tribe_ethnicity: p.tribe_ethnicity || '',
        languages: p.languages || [],
        religion: p.religion || '',
        education: p.education || '',
        profession: p.profession || '',
        relationship_goal: p.relationship_goal || '',
        height_cm: p.height_cm || '',
        lifestyle: p.lifestyle || {},
        cultural_values: p.cultural_values || [],
        interests: p.interests || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Load error:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      await base44.entities.UserProfile.update(profile.id, formData);
      window.location.href = createPageUrl('Profile');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newPhotos = [...(formData.photos || []), file_url];
      setFormData({
        ...formData,
        photos: newPhotos,
        primary_photo: formData.primary_photo || file_url
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    }
    setUploading(false);
  };

  const removePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      photos: newPhotos,
      primary_photo: formData.photos[index] === formData.primary_photo ? (newPhotos[0] || '') : formData.primary_photo
    });
  };

  const setPrimaryPhoto = (photo) => {
    setFormData({ ...formData, primary_photo: photo });
  };

  const toggleItem = (field, item) => {
    const current = formData[field] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    setFormData({ ...formData, [field]: updated });
  };

  const calculateCompletion = () => {
    const fields = [
      formData.display_name,
      formData.bio,
      formData.photos?.length > 0,
      formData.birth_date,
      formData.gender,
      formData.country_of_origin,
      formData.current_country,
      formData.current_city,
      formData.profession,
      formData.education,
      formData.religion,
      formData.relationship_goal,
      formData.languages?.length > 0,
      formData.cultural_values?.length > 0,
      formData.interests?.length > 0
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-amber-50">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-purple-600" size={48} />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const completion = calculateCompletion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative pb-24">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Profile')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft size={22} />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
                <p className="text-xs text-gray-500">{completion}% Complete</p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={18} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={completion} className="h-1.5" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Photos Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-purple-600 to-amber-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Camera size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Your Photos</h2>
                  <p className="text-sm text-white/80">Add up to 6 photos • Set one as primary</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <AnimatePresence>
                  {formData.photos?.map((photo, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden group shadow-lg"
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPrimaryPhoto(photo)}
                          className="rounded-full"
                        >
                          <Sparkles size={14} className="mr-1" />
                          Primary
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removePhoto(idx)}
                          className="rounded-full"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                      
                      {/* Primary Badge */}
                      {photo === formData.primary_photo && (
                        <Badge className="absolute top-3 left-3 bg-amber-500 text-white border-0 shadow-lg">
                          <Sparkles size={12} className="mr-1" />
                          Primary
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Upload Button */}
                {(formData.photos?.length || 0) < 6 && (
                  <motion.label
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-[3/4] rounded-2xl border-3 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-100/50 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                      disabled={uploading} 
                    />
                    {uploading ? (
                      <Loader2 className="animate-spin text-purple-600" size={32} />
                    ) : (
                      <>
                        <div className="p-4 bg-purple-200 rounded-full mb-3 group-hover:scale-110 transition-transform">
                          <Camera size={28} className="text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-purple-700">Add Photo</span>
                      </>
                    )}
                  </motion.label>
                )}
              </div>
              
              {formData.photos?.length === 0 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  ✨ Add at least 3 photos to stand out and get more matches
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Heart size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">About You</h2>
                  <p className="text-sm text-white/80">Tell us about yourself</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6 space-y-5">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  Display Name
                </Label>
                <Input
                  value={formData.display_name || ''}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="How should we call you?"
                  className="border-2 focus:border-purple-400 rounded-xl"
                />
              </div>
              
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Bio</Label>
                <Textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share something interesting about yourself..."
                  rows={4}
                  className="border-2 focus:border-purple-400 rounded-xl resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.bio?.length || 0}/500 characters
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="border-2 focus:border-purple-400 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Gender</Label>
                  <Select 
                    value={formData.gender || ''} 
                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                  >
                    <SelectTrigger className="border-2 rounded-xl">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="man">Man</SelectItem>
                      <SelectItem value="woman">Woman</SelectItem>
                      <SelectItem value="non_binary">Non-binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2">Looking For</Label>
                <Select 
                  value={formData.relationship_goal || ''} 
                  onValueChange={(v) => setFormData({ ...formData, relationship_goal: v })}
                >
                  <SelectTrigger className="border-2 rounded-xl">
                    <SelectValue placeholder="What are you looking for?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dating">Dating</SelectItem>
                    <SelectItem value="serious_relationship">Serious Relationship</SelectItem>
                    <SelectItem value="marriage">Marriage</SelectItem>
                    <SelectItem value="friendship">Friendship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Location & Heritage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Globe size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Location & Heritage</h2>
                  <p className="text-sm text-white/80">Your roots and where you are</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Country of Origin</Label>
                  <Select 
                    value={formData.country_of_origin || ''} 
                    onValueChange={(v) => setFormData({ ...formData, country_of_origin: v })}
                  >
                    <SelectTrigger className="border-2 rounded-xl">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {AFRICAN_COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Tribe / Ethnicity</Label>
                  <Input
                    value={formData.tribe_ethnicity || ''}
                    onChange={(e) => setFormData({ ...formData, tribe_ethnicity: e.target.value })}
                    placeholder="e.g., Yoruba, Zulu, Kikuyu"
                    className="border-2 focus:border-purple-400 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Current Country</Label>
                  <Select 
                    value={formData.current_country || ''} 
                    onValueChange={(v) => setFormData({ ...formData, current_country: v })}
                  >
                    <SelectTrigger className="border-2 rounded-xl">
                      <SelectValue placeholder="Where do you live?" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">City</Label>
                  <Input
                    value={formData.current_city || ''}
                    onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                    placeholder="Your city"
                    className="border-2 focus:border-purple-400 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Work & Education */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Work & Education</h2>
                  <p className="text-sm text-white/80">Your professional life</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Profession</Label>
                  <Input
                    value={formData.profession || ''}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="What do you do?"
                    className="border-2 focus:border-purple-400 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Education</Label>
                  <Select 
                    value={formData.education || ''} 
                    onValueChange={(v) => setFormData({ ...formData, education: v })}
                  >
                    <SelectTrigger className="border-2 rounded-xl">
                      <SelectValue placeholder="Select education" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="some_college">Some College</SelectItem>
                      <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="masters">Master's Degree</SelectItem>
                      <SelectItem value="doctorate">Doctorate</SelectItem>
                      <SelectItem value="trade_school">Trade School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Religion</Label>
                  <Select 
                    value={formData.religion || ''} 
                    onValueChange={(v) => setFormData({ ...formData, religion: v })}
                  >
                    <SelectTrigger className="border-2 rounded-xl">
                      <SelectValue placeholder="Select religion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="christianity">Christianity</SelectItem>
                      <SelectItem value="islam">Islam</SelectItem>
                      <SelectItem value="traditional_african">Traditional African</SelectItem>
                      <SelectItem value="spiritual">Spiritual</SelectItem>
                      <SelectItem value="agnostic">Agnostic</SelectItem>
                      <SelectItem value="atheist">Atheist</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2">Height (cm)</Label>
                  <Input
                    type="number"
                    value={formData.height_cm || ''}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    placeholder="Your height"
                    className="border-2 focus:border-purple-400 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Languages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Globe size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Languages</h2>
                  <p className="text-sm text-white/80">Select all that you speak</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <Badge
                    key={lang}
                    variant={formData.languages?.includes(lang) ? "default" : "outline"}
                    className={`cursor-pointer transition-all text-sm px-4 py-2 ${
                      formData.languages?.includes(lang)
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md scale-105'
                        : 'hover:bg-amber-50 hover:border-amber-300'
                    }`}
                    onClick={() => toggleItem('languages', lang)}
                  >
                    {formData.languages?.includes(lang) && <Check size={14} className="mr-1" />}
                    {lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cultural Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Cultural Values</h2>
                  <p className="text-sm text-white/80">What matters most to you?</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {CULTURAL_VALUES.map(val => (
                  <Badge
                    key={val}
                    variant={formData.cultural_values?.includes(val) ? "default" : "outline"}
                    className={`cursor-pointer transition-all text-sm px-4 py-2 ${
                      formData.cultural_values?.includes(val)
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-md scale-105'
                        : 'hover:bg-purple-50 hover:border-purple-300'
                    }`}
                    onClick={() => toggleItem('cultural_values', val)}
                  >
                    {formData.cultural_values?.includes(val) && <Check size={14} className="mr-1" />}
                    {val}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Interests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Interests & Hobbies</h2>
                  <p className="text-sm text-white/80">What do you love doing?</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(int => (
                  <Badge
                    key={int}
                    variant={formData.interests?.includes(int) ? "default" : "outline"}
                    className={`cursor-pointer transition-all text-sm px-4 py-2 ${
                      formData.interests?.includes(int)
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 shadow-md scale-105'
                        : 'hover:bg-teal-50 hover:border-teal-300'
                    }`}
                    onClick={() => toggleItem('interests', int)}
                  >
                    {formData.interests?.includes(int) && <Check size={14} className="mr-1" />}
                    {int}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button (Bottom) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="flex justify-center pt-4 pb-8"
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white px-12 py-6 text-lg rounded-full shadow-2xl hover:shadow-xl transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={24} />
                Saving Your Profile...
              </>
            ) : (
              <>
                <Save className="mr-2" size={24} />
                Save All Changes
              </>
            )}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}