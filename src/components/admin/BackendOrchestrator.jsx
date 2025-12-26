import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Play, Pause, Settings, Activity, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BackendOrchestrator() {
  const [jobStatuses, setJobStatuses] = useState({});
  const [scheduledJobs, setScheduledJobs] = useState([
    {
      id: 'auto-verify',
      name: 'autoVerifyPhotos',
      title: 'Auto Photo/ID Verification',
      schedule: '*/15 * * * *', // Every 15 minutes
      enabled: true,
      lastRun: null,
      nextRun: null,
      status: 'idle'
    },
    {
      id: 'analyze-patterns',
      name: 'analyzeConversationPatterns',
      title: 'Conversation Pattern Analysis',
      schedule: '*/30 * * * *', // Every 30 minutes
      enabled: true,
      lastRun: null,
      nextRun: null,
      status: 'idle'
    },
    {
      id: 'escalate-alerts',
      name: 'autoEscalateSafetyAlerts',
      title: 'Safety Alert Escalation',
      schedule: '*/5 * * * *', // Every 5 minutes
      enabled: true,
      lastRun: null,
      nextRun: null,
      status: 'idle'
    }
  ]);

  const runJobMutation = useMutation({
    mutationFn: async (jobName) => {
      setJobStatuses(prev => ({ ...prev, [jobName]: 'running' }));
      const response = await base44.functions.invoke(jobName, {});
      return { jobName, data: response.data };
    },
    onSuccess: ({ jobName, data }) => {
      setJobStatuses(prev => ({ ...prev, [jobName]: 'success' }));
      
      // Update last run time
      setScheduledJobs(prev => prev.map(job => 
        job.name === jobName 
          ? { ...job, lastRun: new Date().toISOString(), status: 'success' }
          : job
      ));

      toast.success(`${jobName} completed`, {
        description: `Processed ${data.processed || data.analyzed || data.alerts_checked || 0} items`
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setJobStatuses(prev => ({ ...prev, [jobName]: 'idle' }));
      }, 3000);
    },
    onError: (error, jobName) => {
      setJobStatuses(prev => ({ ...prev, [jobName]: 'error' }));
      toast.error(`${jobName} failed`, {
        description: error.message
      });

      setTimeout(() => {
        setJobStatuses(prev => ({ ...prev, [jobName]: 'idle' }));
      }, 3000);
    }
  });

  const toggleJobEnabled = (jobId) => {
    setScheduledJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, enabled: !job.enabled } : job
    ));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-600 animate-pulse"><Activity size={12} className="mr-1" /> Running</Badge>;
      case 'success':
        return <Badge className="bg-green-600"><CheckCircle size={12} className="mr-1" /> Success</Badge>;
      case 'error':
        return <Badge className="bg-red-600"><XCircle size={12} className="mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline"><Clock size={12} className="mr-1" /> Scheduled</Badge>;
    }
  };

  const formatSchedule = (cron) => {
    if (cron === '*/15 * * * *') return 'Every 15 minutes';
    if (cron === '*/30 * * * *') return 'Every 30 minutes';
    if (cron === '*/5 * * * *') return 'Every 5 minutes';
    return cron;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-purple-600" />
            Backend Job Orchestrator
          </h3>
          <p className="text-sm text-gray-600">Manage and monitor automated backend jobs</p>
        </div>
        <Badge className="bg-green-600">
          {scheduledJobs.filter(j => j.enabled).length} Active
        </Badge>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4">
        {scheduledJobs.map(job => {
          const currentStatus = jobStatuses[job.name] || job.status;
          
          return (
            <Card key={job.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  {getStatusBadge(currentStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Job Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Schedule</p>
                    <p className="font-medium">{formatSchedule(job.schedule)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Run</p>
                    <p className="font-medium">
                      {job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => runJobMutation.mutate(job.name)}
                    disabled={currentStatus === 'running' || !job.enabled}
                    size="sm"
                    className="flex-1"
                  >
                    {currentStatus === 'running' ? (
                      <>
                        <Pause size={14} className="mr-2" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play size={14} className="mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={job.enabled}
                      onCheckedChange={() => toggleJobEnabled(job.id)}
                    />
                    <span className="text-sm text-gray-600">
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bulk Actions</p>
              <p className="text-sm text-gray-600">Run all enabled jobs at once</p>
            </div>
            <Button
              onClick={() => {
                scheduledJobs
                  .filter(job => job.enabled)
                  .forEach(job => runJobMutation.mutate(job.name));
              }}
              disabled={runJobMutation.isPending}
            >
              <Play size={16} className="mr-2" />
              Run All Jobs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}