import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Plus, Edit, Trash2, Star, Check, X, MapPin, 
  DollarSign, Phone, Mail, Globe, Image as ImageIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import GoogleMapsLocation from '@/components/shared/GoogleMapsLocation';

export default function VendorManagement() {
  const [myProfile, setMyProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    category: '',
    description: '',
    country: '',
    city: '',
    location: { lat: null, lng: null },
    price_range: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    photos: [],
    is_verified: false,
    rating: 5.0
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await base44.auth.me();
      if (user) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
          setIsAdmin(user.role === 'admin' || user.email === 'pivotngoyb@gmail.com');
        }
      }
    };
    checkAuth();
  }, []);

  const { data: vendors = [] } = useQuery({
    queryKey: ['wedding-vendors-manage'],
    queryFn: () => base44.entities.WeddingVendor.list('-created_date'),
    enabled: isAdmin
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.WeddingVendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wedding-vendors-manage']);
      queryClient.invalidateQueries(['wedding-vendors']);
      resetForm();
    }
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WeddingVendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wedding-vendors-manage']);
      queryClient.invalidateQueries(['wedding-vendors']);
      resetForm();
    }
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id) => base44.entities.WeddingVendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['wedding-vendors-manage']);
      queryClient.invalidateQueries(['wedding-vendors']);
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, file_url]
      }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createVendorMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      category: '',
      description: '',
      country: '',
      city: '',
      location: { lat: null, lng: null },
      price_range: '',
      contact_phone: '',
      contact_email: '',
      website: '',
      photos: [],
      is_verified: false,
      rating: 5.0
    });
    setEditingVendor(null);
    setShowForm(false);
  };

  const handleEdit = (vendor) => {
    setFormData(vendor);
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      deleteVendorMutation.mutate(id);
    }
  };

  const categories = [
    { value: 'venue', label: 'Venues' },
    { value: 'photographer', label: 'Photographers' },
    { value: 'catering', label: 'Catering' },
    { value: 'dj', label: 'DJ/Music' },
    { value: 'decorator', label: 'Decorators' },
    { value: 'planner', label: 'Planners' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'makeup', label: 'Makeup' }
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Vendor Management</h1>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} className="mr-2" />
            Add Vendor
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => (
            <Card key={vendor.id}>
              <CardContent className="p-0">
                {vendor.photos?.[0] && (
                  <img
                    src={vendor.photos[0]}
                    alt={vendor.vendor_name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{vendor.category}</Badge>
                    {vendor.is_verified && (
                      <Badge variant="outline" className="text-green-600">
                        <Check size={12} className="mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold mb-1">{vendor.vendor_name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{vendor.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <MapPin size={14} />
                    <span>{vendor.city}, {vendor.country}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vendor)}
                      className="flex-1"
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(vendor.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Vendor Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Vendor Name</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Location on Map</Label>
              <GoogleMapsLocation
                initialLocation={formData.location}
                onLocationSelect={(location) => setFormData({ ...formData, location })}
                height="200px"
              />
            </div>

            <div>
              <Label>Price Range</Label>
              <Input
                value={formData.price_range}
                onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                placeholder="e.g., $500 - $2000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://"
              />
            </div>

            <div>
              <Label>Photos</Label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={photo} alt="" className="w-full h-full object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        photos: formData.photos.filter((_, i) => i !== idx)
                      })}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50">
                  <ImageIcon size={24} className="mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Upload Photo</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_verified"
                checked={formData.is_verified}
                onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_verified">Verified Vendor</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVendor ? 'Update' : 'Create'} Vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}