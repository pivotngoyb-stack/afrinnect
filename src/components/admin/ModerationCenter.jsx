import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle, Eye, Ban, MessageCircle, Image, Flag } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";

export default function ModerationCenter({ reports, onResolveReport }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [moderatorNotes, setModeratorNotes] = useState('');

  const reportsByStatus = {
    pending: reports.filter(r => r.status === 'pending'),
    under_review: reports.filter(r => r.status === 'under_review'),
    resolved: reports.filter(r => r.status === 'resolved')
  };

  const reportTypeColors = {
    fake_profile: 'bg-orange-600',
    harassment: 'bg-red-600',
    inappropriate_content: 'bg-purple-600',
    scam: 'bg-red-700',
    underage: 'bg-red-800',
    spam: 'bg-yellow-600',
    hate_speech: 'bg-red-900',
    other: 'bg-gray-600'
  };

  const handleResolve = (report, action) => {
    onResolveReport({
      reportId: report.id,
      action,
      notes: moderatorNotes
    });
    setModeratorNotes('');
    setSelectedReport(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{reportsByStatus.pending.length}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye size={24} className="text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{reportsByStatus.under_review.length}</p>
                <p className="text-sm text-gray-600">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <p className="text-2xl font-bold">{reportsByStatus.resolved.length}</p>
                <p className="text-sm text-gray-600">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ban size={24} className="text-red-600" />
              <div>
                <p className="text-2xl font-bold">{reports.filter(r => r.action_taken === 'permanent_ban').length}</p>
                <p className="text-sm text-gray-600">Bans Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag size={20} />
            Report Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid grid-cols-3 w-full mb-6">
              <TabsTrigger value="pending">
                Pending ({reportsByStatus.pending.length})
              </TabsTrigger>
              <TabsTrigger value="under_review">
                Under Review ({reportsByStatus.under_review.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({reportsByStatus.resolved.length})
              </TabsTrigger>
            </TabsList>

            {['pending', 'under_review', 'resolved'].map(status => (
              <TabsContent key={status} value={status}>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {reportsByStatus[status].map(report => (
                    <div key={report.id} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={reportTypeColors[report.report_type] || 'bg-gray-600'}>
                              {report.report_type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">
                              {new Date(report.created_date).toLocaleDateString()}
                            </Badge>
                          </div>
                          <p className="font-semibold text-gray-900 mb-1">
                            Reported User: {report.reported_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Reporter: {report.reporter_id}
                          </p>
                        </div>
                        <Badge className={
                          status === 'pending' ? 'bg-yellow-600' :
                          status === 'under_review' ? 'bg-blue-600' :
                          'bg-green-600'
                        }>
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-3 p-3 bg-white rounded border">
                        {report.description}
                      </p>

                      {report.evidence_urls && report.evidence_urls.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600 mb-2">Evidence:</p>
                          <div className="flex gap-2">
                            {report.evidence_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt="Evidence"
                                className="w-20 h-20 object-cover rounded border"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {status !== 'resolved' && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            placeholder="Moderator notes..."
                            value={selectedReport === report.id ? moderatorNotes : ''}
                            onChange={(e) => {
                              setSelectedReport(report.id);
                              setModeratorNotes(e.target.value);
                            }}
                            className="h-20"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700"
                              onClick={() => handleResolve(report, 'warning')}
                            >
                              Issue Warning
                            </Button>
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700"
                              onClick={() => handleResolve(report, 'temporary_ban')}
                            >
                              Temporary Ban
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleResolve(report, 'permanent_ban')}
                            >
                              Permanent Ban
                            </Button>
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleResolve(report, 'content_removed')}
                            >
                              Remove Content
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(report, 'none')}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      )}

                      {status === 'resolved' && (
                        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                          <p className="text-sm text-green-800">
                            <strong>Action Taken:</strong> {report.action_taken?.replace('_', ' ')}
                          </p>
                          {report.moderator_notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Notes:</strong> {report.moderator_notes}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Resolved by {report.resolved_by} on {new Date(report.resolved_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {reportsByStatus[status].length === 0 && (
                    <p className="text-center text-gray-500 py-8">No reports in this category</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}