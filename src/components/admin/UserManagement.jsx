import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Eye, Ban, Trash2, Send, Shield, Crown, CheckCircle, Download } from 'lucide-react';

export default function UserManagement({ 
  profiles, 
  users, 
  searchTerm, 
  onSearchChange,
  onViewUser,
  onBanUser,
  onDeleteUser,
  onMessageUser,
  onToggleAdmin
}) {
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubscription, setFilterSubscription] = useState('all');

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.user_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = filterCountry === 'all' || p.current_country === filterCountry;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && p.is_active) ||
                         (filterStatus === 'banned' && !p.is_active);
    const matchesSubscription = filterSubscription === 'all' ||
                               (filterSubscription === 'premium' && p.is_premium) ||
                               (filterSubscription === 'free' && !p.is_premium);
    
    return matchesSearch && matchesCountry && matchesStatus && matchesSubscription;
  });

  const countries = [...new Set(profiles.map(p => p.current_country).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{profiles.length}</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{profiles.filter(p => p.is_active).length}</p>
            <p className="text-sm text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{profiles.filter(p => p.is_premium).length}</p>
            <p className="text-sm text-gray-600">Premium</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{profiles.filter(p => p.verification_status?.photo_verified).length}</p>
            <p className="text-sm text-gray-600">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{profiles.filter(p => !p.is_active).length}</p>
            <p className="text-sm text-gray-600">Banned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter size={20} />
              Filters & Search
            </span>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSubscription} onValueChange={setFilterSubscription}>
              <SelectTrigger>
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProfiles.map(profile => {
              const user = users.find(u => u.id === profile.user_id);
              const isUserAdmin = user?.role === 'admin' || user?.email === 'pivotngoyb@gmail.com';
              
              return (
                <div key={profile.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition border">
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={profile.primary_photo || profile.photos?.[0] || 'https://via.placeholder.com/50'}
                      alt={profile.display_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{profile.display_name}</p>
                        {profile.verification_status?.photo_verified && (
                          <CheckCircle size={16} className="text-green-500" />
                        )}
                        {profile.is_premium && (
                          <Crown size={16} className="text-amber-500" />
                        )}
                        {isUserAdmin && (
                          <Badge className="bg-red-600">Admin</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                      <p className="text-xs text-gray-500">
                        {profile.current_city}, {profile.current_country} • {profile.gender} • Created {new Date(profile.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={profile.is_active ? 'bg-green-600' : 'bg-red-600'}>
                      {profile.is_active ? 'Active' : 'Banned'}
                    </Badge>
                    {user?.email !== 'pivotngoyb@gmail.com' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleAdmin(user.id, !isUserAdmin)}
                      >
                        <Shield size={16} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMessageUser(profile)}
                    >
                      <Send size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewUser(profile.id)}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => onBanUser(profile)}
                      disabled={user?.email === 'pivotngoyb@gmail.com'}
                    >
                      <Ban size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => onDeleteUser(profile)}
                      disabled={user?.email === 'pivotngoyb@gmail.com'}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}