import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Camera, Plus, X, Loader2, Save
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      if (profiles.length > 0) {
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
          lifestyle: p.lifestyle || { smoking: '', drinking: '', fitness: '', children: '' },
          cultural_values: p.cultural_values || [],
          interests: p.interests || []
        });
      }
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

  const toggleItem = (field, item) => {
    const current = formData[field] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    setFormData({ ...formData, [field]: updated });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600">
            {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {formData.photos?.map((photo, idx) => (
                <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X size={16} />
                  </button>
                  {photo === formData.primary_photo && (
                    <Badge className="absolute top-2 left-2 bg-amber-500">Primary</Badge>
                  )}
                </div>
              ))}
              
              {(formData.photos?.length || 0) < 6 && (
                <label className="aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  {uploading ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input
                value={formData.display_name || ''}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            
            <div>
              <Label>Bio</Label>
              <Textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.birth_date || ''}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Gender</Label>
              <Select value={formData.gender || ''} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="man">Man</SelectItem>
                  <SelectItem value="woman">Woman</SelectItem>
                  <SelectItem value="non_binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Looking For</Label>
              <Select value={formData.relationship_goal || ''} onValueChange={(v) => setFormData({ ...formData, relationship_goal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dating">Dating</SelectItem>
                  <SelectItem value="serious_relationship">Serious Relationship</SelectItem>
                  <SelectItem value="marriage">Marriage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location & Heritage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Country of Origin</Label>
              <Select value={formData.country_of_origin || ''} onValueChange={(v) => setFormData({ ...formData, country_of_origin: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AFRICAN_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tribe / Ethnicity</Label>
              <Input
                value={formData.tribe_ethnicity || ''}
                onChange={(e) => setFormData({ ...formData, tribe_ethnicity: e.target.value })}
              />
            </div>

            <div>
              <Label>Current Country</Label>
              <Select value={formData.current_country || ''} onValueChange={(v) => setFormData({ ...formData, current_country: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>City</Label>
              <Input
                value={formData.current_city || ''}
                onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Work & Education */}
        <Card>
          <CardHeader>
            <CardTitle>Work & Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Profession</Label>
              <Input
                value={formData.profession || ''}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              />
            </div>

            <div>
              <Label>Education</Label>
              <Select value={formData.education || ''} onValueChange={(v) => setFormData({ ...formData, education: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="bachelors">Bachelor's</SelectItem>
                  <SelectItem value="masters">Master's</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Religion</Label>
              <Select value={formData.religion || ''} onValueChange={(v) => setFormData({ ...formData, religion: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="christianity">Christianity</SelectItem>
                  <SelectItem value="islam">Islam</SelectItem>
                  <SelectItem value="traditional_african">Traditional African</SelectItem>
                  <SelectItem value="spiritual">Spiritual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Height (cm)</Label>
              <Input
                type="number"
                value={formData.height_cm || ''}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <Badge
                  key={lang}
                  variant={formData.languages?.includes(lang) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleItem('languages', lang)}
                >
                  {lang}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cultural Values */}
        <Card>
          <CardHeader>
            <CardTitle>Cultural Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CULTURAL_VALUES.map(val => (
                <Badge
                  key={val}
                  variant={formData.cultural_values?.includes(val) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleItem('cultural_values', val)}
                >
                  {val}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(int => (
                <Badge
                  key={int}
                  variant={formData.interests?.includes(int) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleItem('interests', int)}
                >
                  {int}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}