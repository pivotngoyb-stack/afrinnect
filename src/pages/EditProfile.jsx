import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Camera, Plus, X, Loader2, Sparkles, Save
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
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

const PROMPTS = [
  "What's your favorite African tradition?",
  "A perfect Sunday for me looks like...",
  "My love language is...",
  "I'm looking for someone who...",
  "The way to my heart is through...",
  "My family would describe me as...",
  "A cause I care about is...",
  "My hidden talent is..."
];

export default function EditProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    birth_date: '',
    gender: '',
    looking_for: [],
    photos: [],
    country_of_origin: '',
    current_country: '',
    current_state: '',
    current_city: '',
    preferred_language: 'en',
    tribe_ethnicity: '',
    languages: [],
    religion: '',
    education: '',
    profession: '',
    relationship_goal: '',
    height_cm: '',
    lifestyle: {
      smoking: '',
      drinking: '',
      fitness: '',
      children: ''
    },
    cultural_values: [],
    interests: [],
    prompts: []
  });
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const profiles = await base44.entities.UserProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) {
          const profileData = profiles[0];
          setProfile(profileData);
          setFormData(prev => ({
            ...prev,
            ...profileData,
            lifestyle: profileData.lifestyle || prev.lifestyle,
            photos: profileData.photos || [],
            languages: profileData.languages || [],
            cultural_values: profileData.cultural_values || [],
            interests: profileData.interests || [],
            prompts: profileData.prompts || [],
            looking_for: profileData.looking_for || []
          }));
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfile();
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLifestyle = (field, value) => {
    setFormData(prev => ({
      ...prev,
      lifestyle: { ...prev.lifestyle, [field]: value }
    }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.includes(item)
        ? prev[field].filter(i => i !== item)
        : [...(prev[field] || []), item]
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newPhotos = [...(formData.photos || []), file_url];
      updateField('photos', newPhotos);
      if (!formData.primary_photo) {
        updateField('primary_photo', file_url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setIsUploading(false);
  };

  const removePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    updateField('photos', newPhotos);
    if (formData.photos[index] === formData.primary_photo) {
      updateField('primary_photo', newPhotos[0] || '');
    }
  };

  const setPrimaryPhoto = (url) => {
    updateField('primary_photo', url);
  };

  const addPrompt = (question) => {
    if (formData.prompts?.length >= 3) return;
    setFormData(prev => ({
      ...prev,
      prompts: [...(prev.prompts || []), { question, answer: '' }]
    }));
  };

  const updatePromptAnswer = (index, answer) => {
    const newPrompts = [...formData.prompts];
    newPrompts[index] = { ...newPrompts[index], answer };
    updateField('prompts', newPrompts);
  };

  const removePrompt = (index) => {
    const newPrompts = formData.prompts.filter((_, i) => i !== index);
    updateField('prompts', newPrompts);
  };

  const generateBio = async () => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a short, engaging dating profile bio (max 150 words) for someone who:
        - Is from ${formData.country_of_origin}
        - Works as ${formData.profession || 'a professional'}
        - Values: ${formData.cultural_values?.join(', ') || 'family and culture'}
        - Interests: ${formData.interests?.join(', ') || 'various activities'}
        - Looking for: ${formData.relationship_goal || 'meaningful connection'}
        
        Make it warm, authentic, and highlight cultural pride. Use first person.`,
        response_json_schema: {
          type: 'object',
          properties: {
            bio: { type: 'string' }
          }
        }
      });
      if (result.bio) {
        updateField('bio', result.bio);
      }
    } catch (error) {
      console.error('Bio generation failed:', error);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dataToSave = {
        ...formData,
        user_id: user.id,
        is_active: true,
        last_active: new Date().toISOString()
      };
      
      if (profile) {
        return base44.entities.UserProfile.update(profile.id, dataToSave);
      } else {
        return base44.entities.UserProfile.create(dataToSave);
      }
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Profile');
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Profile')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={24} />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Edit Profile</h1>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saveMutation.isPending ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="culture">Culture</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {formData.photos?.map((photo, idx) => (
                    <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPrimaryPhoto(photo)}
                          className={`p-2 rounded-full ${photo === formData.primary_photo ? 'bg-amber-500' : 'bg-white/80'}`}
                        >
                          <Sparkles size={16} />
                        </button>
                        <button
                          onClick={() => removePhoto(idx)}
                          className="p-2 rounded-full bg-red-500 text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {photo === formData.primary_photo && (
                        <Badge className="absolute top-2 left-2 bg-amber-500 text-xs">Primary</Badge>
                      )}
                    </div>
                  ))}
                  
                  {(formData.photos?.length || 0) < 6 && (
                    <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <Loader2 size={24} className="text-purple-600 animate-spin" />
                      ) : (
                        <>
                          <Camera size={24} className="text-gray-400 mb-2" />
                          <span className="text-xs text-gray-500">Add Photo</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Add up to 6 photos. First photo will be your main profile picture.</p>
              </CardContent>
            </Card>

            {/* Name & Bio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About You</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => updateField('display_name', e.target.value)}
                    placeholder="Your name or nickname"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Bio</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateBio}
                      className="text-purple-600 text-xs"
                    >
                      <Sparkles size={14} className="mr-1" />
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Tell others about yourself..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => updateField('birth_date', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="man">Man</SelectItem>
                        <SelectItem value="woman">Woman</SelectItem>
                        <SelectItem value="non_binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Looking For</Label>
                    <Select value={formData.relationship_goal} onValueChange={(v) => updateField('relationship_goal', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dating">Dating</SelectItem>
                        <SelectItem value="serious_relationship">Serious Relationship</SelectItem>
                        <SelectItem value="marriage">Marriage</SelectItem>
                        <SelectItem value="friendship">Friendship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location & Heritage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Country of Origin (Heritage)</Label>
                  <Select value={formData.country_of_origin} onValueChange={(v) => updateField('country_of_origin', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your heritage country" />
                    </SelectTrigger>
                    <SelectContent>
                      {AFRICAN_COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tribe / Ethnicity (Optional)</Label>
                  <Input
                    value={formData.tribe_ethnicity}
                    onChange={(e) => updateField('tribe_ethnicity', e.target.value)}
                    placeholder="e.g., Yoruba, Zulu, Akan..."
                  />
                </div>

                <div>
                  <Label>Current Country</Label>
                  <Select value={formData.current_country} onValueChange={(v) => updateField('current_country', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where do you live now?" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.current_country === 'USA' && (
                  <div>
                    <Label>State</Label>
                    <Select value={formData.current_state} onValueChange={(v) => updateField('current_state', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.current_city}
                    onChange={(e) => updateField('current_city', e.target.value)}
                    placeholder="Your city"
                  />
                </div>

                <div>
                  <Label>App Language</Label>
                  <Select value={formData.preferred_language} onValueChange={(v) => updateField('preferred_language', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Work & Education</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Profession</Label>
                  <Input
                    value={formData.profession}
                    onChange={(e) => updateField('profession', e.target.value)}
                    placeholder="What do you do?"
                  />
                </div>

                <div>
                  <Label>Education Level</Label>
                  <Select value={formData.education} onValueChange={(v) => updateField('education', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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

                <div>
                  <Label>Religion</Label>
                  <Select value={formData.religion} onValueChange={(v) => updateField('religion', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="christianity">Christianity</SelectItem>
                      <SelectItem value="islam">Islam</SelectItem>
                      <SelectItem value="traditional_african">Traditional African</SelectItem>
                      <SelectItem value="spiritual">Spiritual</SelectItem>
                      <SelectItem value="agnostic">Agnostic</SelectItem>
                      <SelectItem value="atheist">Atheist</SelectItem>
                      <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => updateField('height_cm', parseInt(e.target.value))}
                    placeholder="e.g., 175"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lifestyle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Smoking</Label>
                    <Select value={formData.lifestyle?.smoking} onValueChange={(v) => updateLifestyle('smoking', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="sometimes">Sometimes</SelectItem>
                        <SelectItem value="regularly">Regularly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Drinking</Label>
                    <Select value={formData.lifestyle?.drinking} onValueChange={(v) => updateLifestyle('drinking', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="socially">Socially</SelectItem>
                        <SelectItem value="regularly">Regularly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Fitness</Label>
                    <Select value={formData.lifestyle?.fitness} onValueChange={(v) => updateLifestyle('fitness', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="sometimes">Sometimes</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="very_active">Very Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Children</Label>
                    <Select value={formData.lifestyle?.children} onValueChange={(v) => updateLifestyle('children', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="have_want_more">Have & want more</SelectItem>
                        <SelectItem value="have_dont_want_more">Have, don't want more</SelectItem>
                        <SelectItem value="dont_have_want">Don't have, want</SelectItem>
                        <SelectItem value="dont_have_dont_want">Don't have, don't want</SelectItem>
                        <SelectItem value="undecided">Undecided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Culture Tab */}
          <TabsContent value="culture" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <Badge
                      key={lang}
                      variant={formData.languages?.includes(lang) ? "default" : "outline"}
                      className={`cursor-pointer transition ${
                        formData.languages?.includes(lang)
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-purple-50'
                      }`}
                      onClick={() => toggleArrayItem('languages', lang)}
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cultural Values</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {CULTURAL_VALUES.map(value => (
                    <Badge
                      key={value}
                      variant={formData.cultural_values?.includes(value) ? "default" : "outline"}
                      className={`cursor-pointer transition ${
                        formData.cultural_values?.includes(value)
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                      }`}
                      onClick={() => toggleArrayItem('cultural_values', value)}
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(interest => (
                    <Badge
                      key={interest}
                      variant={formData.interests?.includes(interest) ? "default" : "outline"}
                      className={`cursor-pointer transition ${
                        formData.interests?.includes(interest)
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-purple-50'
                      }`}
                      onClick={() => toggleArrayItem('interests', interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Prompts ({formData.prompts?.length || 0}/3)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.prompts?.map((prompt, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-purple-700">{prompt.question}</p>
                      <button
                        onClick={() => removePrompt(idx)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <Textarea
                      value={prompt.answer}
                      onChange={(e) => updatePromptAnswer(idx, e.target.value)}
                      placeholder="Your answer..."
                      rows={2}
                      className="bg-white"
                    />
                  </div>
                ))}

                {(formData.prompts?.length || 0) < 3 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Add a prompt:</p>
                    <div className="space-y-2">
                      {PROMPTS.filter(p => !formData.prompts?.some(fp => fp.question === p)).map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => addPrompt(prompt)}
                          className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition flex items-center justify-between"
                        >
                          <span>{prompt}</span>
                          <Plus size={16} className="text-purple-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}