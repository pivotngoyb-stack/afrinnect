import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Mail, Send, Users, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmailCampaignManager() {
  const [campaign, setCampaign] = useState({
    campaign_title: '',
    subject: '',
    body: '',
    target_audience: 'all'
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('sendNewsletterEmail', data),
    onSuccess: (result) => {
      alert(`Campaign sent! ${result.data.sent} emails delivered to ${result.data.targeted} users.`);
      setCampaign({ campaign_title: '', subject: '', body: '', target_audience: 'all' });
    },
    onError: (error) => {
      alert('Failed to send campaign: ' + error.message);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail size={20} />
          Email Campaign Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Campaign Title</Label>
          <Input
            value={campaign.campaign_title}
            onChange={(e) => setCampaign({ ...campaign, campaign_title: e.target.value })}
            placeholder="Internal campaign name"
          />
        </div>

        <div>
          <Label>Email Subject</Label>
          <Input
            value={campaign.subject}
            onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
            placeholder="What users will see in their inbox"
          />
        </div>

        <div>
          <Label>Email Body</Label>
          <Textarea
            value={campaign.body}
            onChange={(e) => setCampaign({ ...campaign, body: e.target.value })}
            placeholder="Write your message..."
            className="h-32"
          />
          <p className="text-xs text-gray-500 mt-1">
            Personalization: {'{name}'} will be replaced with user's name
          </p>
        </div>

        <div>
          <Label>Target Audience</Label>
          <Select 
            value={campaign.target_audience}
            onValueChange={(v) => setCampaign({ ...campaign, target_audience: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  All Users
                </div>
              </SelectItem>
              <SelectItem value="premium">Premium Users</SelectItem>
              <SelectItem value="free">Free Users</SelectItem>
              <SelectItem value="inactive">Inactive (7+ days)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => sendCampaignMutation.mutate(campaign)}
          disabled={!campaign.subject || !campaign.body || sendCampaignMutation.isPending}
          className="w-full bg-purple-600"
        >
          {sendCampaignMutation.isPending ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Sending Campaign...
            </>
          ) : (
            <>
              <Send size={18} className="mr-2" />
              Send Campaign
            </>
          )}
        </Button>

        {sendCampaignMutation.isSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            Campaign sent successfully!
          </div>
        )}
      </CardContent>
    </Card>
  );
}