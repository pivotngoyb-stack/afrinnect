import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Users, Flag, Shield, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Eye, Ban, ChevronRight, Search,
  Filter, BarChart3, Calendar, Globe
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Logo from '@/components/shared/Logo';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReport, setSelectedReport] = useState(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const queryClient = useQueryClient();

  // Fetch all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 100)
  });

  // Fetch all reports
  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => base44.entities.Report.list('-created_date', 100)
  });

  // Fetch all matches
  const { data: matches = [] } = useQuery({
    queryKey: ['admin-matches'],
    queryFn: () => base44.entities.Match.list('-created_date', 100)
  });

  // Fetch all subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.filter({ status: 'active' })
  });

  // Handle report resolution
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action }) => {
      await base44.entities.Report.update(reportId, {
        status: 'resolved',
        action_taken: action,
        moderator_notes: moderatorNotes,
        resolved_at: new Date().toISOString()
      });

      if (action === 'permanent_ban') {
        const report = reports.find(r => r.id === reportId);
        if (report) {
          await base44.entities.UserProfile.update(report.reported_id, {
            is_active: false
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-reports']);
      setSelectedReport(null);
      setModeratorNotes('');
    }
  });

  // Calculate stats
  const stats = {
    totalUsers: profiles.length,
    activeUsers: profiles.filter(p => p.is_active).length,
    premiumUsers: profiles.filter(p => p.is_premium).length,
    totalMatches: matches.filter(m => m.is_match).length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    verifiedUsers: profiles.filter(p => p.verification_status?.photo_verified).length
  };

  const reportTypeLabels = {
    fake_profile: 'Fake Profile',
    harassment: 'Harassment',
    inappropriate_content: 'Inappropriate Content',
    scam: 'Scam',
    underage: 'Underage',
    hate_speech: 'Hate Speech',
    other: 'Other'
  };

  const reportStatusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <Badge className="bg-purple-600">Admin</Badge>
          </div>
          <div className="text-sm text-gray-500">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users size={20} className="text-purple-600" />
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Total Users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp size={20} className="text-green-600" />
                <span className="text-2xl font-bold">{stats.activeUsers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Active Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Shield size={20} className="text-amber-600" />
                <span className="text-2xl font-bold">{stats.premiumUsers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Premium Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle size={20} className="text-blue-600" />
                <span className="text-2xl font-bold">{stats.verifiedUsers}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Verified</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <BarChart3 size={20} className="text-pink-600" />
                <span className="text-2xl font-bold">{stats.totalMatches}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Total Matches</p>
            </CardContent>
          </Card>

          <Card className={stats.pendingReports > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Flag size={20} className={stats.pendingReports > 0 ? 'text-red-600' : 'text-gray-600'} />
                <span className={`text-2xl font-bold ${stats.pendingReports > 0 ? 'text-red-600' : ''}`}>
                  {stats.pendingReports}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Pending Reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              Reports
              {stats.pendingReports > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs">
                  {stats.pendingReports}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users size={18} />
                    Recent Signups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profiles.slice(0, 5).map(profile => (
                      <div key={profile.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <img
                          src={profile.primary_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                          alt={profile.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{profile.display_name}</p>
                          <p className="text-xs text-gray-500">{profile.current_city}, {profile.current_country}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {profile.is_premium ? 'Premium' : 'Free'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" />
                    Pending Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reports.filter(r => r.status === 'pending').length > 0 ? (
                    <div className="space-y-3">
                      {reports.filter(r => r.status === 'pending').slice(0, 5).map(report => (
                        <div 
                          key={report.id} 
                          className="p-3 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100"
                          onClick={() => setSelectedReport(report)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge className="bg-amber-100 text-amber-800 text-xs">
                              {reportTypeLabels[report.report_type]}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {format(new Date(report.created_date), 'MMM d')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{report.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                      <p>No pending reports!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">User Management</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search users..." className="w-64" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Heritage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map(profile => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={profile.primary_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                              alt={profile.display_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium">{profile.display_name}</p>
                              <p className="text-xs text-gray-500">{profile.created_by}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {profile.current_city}, {profile.current_country}
                        </TableCell>
                        <TableCell className="text-sm">{profile.country_of_origin}</TableCell>
                        <TableCell>
                          <Badge variant={profile.is_active ? 'default' : 'destructive'}>
                            {profile.is_active ? 'Active' : 'Banned'}
                          </Badge>
                          {profile.is_premium && (
                            <Badge className="ml-1 bg-amber-500">Premium</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.verification_status?.photo_verified ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : (
                            <XCircle size={18} className="text-gray-300" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(profile.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Reports & Moderation</CardTitle>
                  <Select defaultValue="pending">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Reported User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline">{reportTypeLabels[report.report_type]}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm">{report.description}</p>
                        </TableCell>
                        <TableCell className="text-sm">{report.reporter_id}</TableCell>
                        <TableCell className="text-sm">{report.reported_id}</TableCell>
                        <TableCell>
                          <Badge className={reportStatusColors[report.status]}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(report.created_date), 'MMM d')}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe size={18} />
                    Users by Country
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      profiles.reduce((acc, p) => {
                        acc[p.current_country] = (acc[p.current_country] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span className="text-sm">{country}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-100 rounded-full">
                              <div 
                                className="h-full bg-purple-600 rounded-full" 
                                style={{ width: `${(count / profiles.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 size={18} />
                    Heritage Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      profiles.reduce((acc, p) => {
                        acc[p.country_of_origin] = (acc[p.country_of_origin] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span className="text-sm">{country}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-100 rounded-full">
                              <div 
                                className="h-full bg-amber-500 rounded-full" 
                                style={{ width: `${(count / profiles.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Report Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Take action on this report
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge>{reportTypeLabels[selectedReport.report_type]}</Badge>
                  <span className="text-xs text-gray-500">
                    {format(new Date(selectedReport.created_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{selectedReport.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Moderator Notes</label>
                <Textarea
                  value={moderatorNotes}
                  onChange={(e) => setModeratorNotes(e.target.value)}
                  placeholder="Add notes about this report..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => resolveReportMutation.mutate({ 
                reportId: selectedReport?.id, 
                action: 'none' 
              })}
            >
              Dismiss
            </Button>
            <Button
              variant="outline"
              className="text-amber-600"
              onClick={() => resolveReportMutation.mutate({ 
                reportId: selectedReport?.id, 
                action: 'warning' 
              })}
            >
              Send Warning
            </Button>
            <Button
              variant="destructive"
              onClick={() => resolveReportMutation.mutate({ 
                reportId: selectedReport?.id, 
                action: 'permanent_ban' 
              })}
            >
              <Ban size={16} className="mr-2" />
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}