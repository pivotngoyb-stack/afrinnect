import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Plus, Edit2, Star } from 'lucide-react';

export default function PricingManagement({ plans }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    plan_id: '',
    name: '',
    tier: 'premium',
    billing_period: 'monthly',
    price_usd: 0,
    features: [],
    is_active: true,
    is_featured: false
  });
  const queryClient = useQueryClient();

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      if (editingPlan) {
        await base44.entities.PricingPlan.update(editingPlan.id, formData);
      } else {
        await base44.entities.PricingPlan.create(formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pricing-plans']);
      setShowDialog(false);
      setEditingPlan(null);
      resetForm();
    }
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ planId, is_active }) => {
      await base44.entities.PricingPlan.update(planId, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-pricing-plans']);
    }
  });

  const resetForm = () => {
    setFormData({
      plan_id: '',
      name: '',
      tier: 'premium',
      billing_period: 'monthly',
      price_usd: 0,
      features: [],
      is_active: true,
      is_featured: false
    });
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign size={24} className="text-green-600" />
              <div>
                <p className="text-2xl font-bold">{plans.length}</p>
                <p className="text-sm text-gray-600">Total Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star size={24} className="text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
                <p className="text-sm text-gray-600">Active Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign size={24} className="text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  ${plans.filter(p => p.is_active).reduce((sum, p) => sum + p.price_usd, 0).toFixed(0)}
                </p>
                <p className="text-sm text-gray-600">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Button className="w-full" onClick={() => setShowDialog(true)}>
              <Plus size={18} className="mr-2" />
              Add Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {plan.is_featured && <Badge className="bg-amber-500">Featured</Badge>}
                      {!plan.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      ${plan.price_usd}
                      <span className="text-sm text-gray-600">/{plan.billing_period}</span>
                    </p>
                    <Badge variant="outline" className="mt-2">{plan.tier}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(checked) => togglePlanMutation.mutate({
                        planId: plan.id,
                        is_active: checked
                      })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                      <Edit2 size={16} />
                    </Button>
                  </div>
                </div>
                {plan.features && plan.features.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {plan.features.slice(0, 3).join(', ')}
                    {plan.features.length > 3 && ` +${plan.features.length - 3} more`}
                  </div>
                )}
              </div>
            ))}
            {plans.length === 0 && (
              <p className="col-span-2 text-center text-gray-500 py-8">No pricing plans configured</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingPlan(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Plan ID</label>
              <Input
                placeholder="e.g., premium_monthly"
                value={formData.plan_id}
                onChange={(e) => setFormData({...formData, plan_id: e.target.value})}
                className="mt-2"
                disabled={!!editingPlan}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Plan Name</label>
              <Input
                placeholder="e.g., Premium Monthly"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tier</label>
                <Select value={formData.tier} onValueChange={(v) => setFormData({...formData, tier: v})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Billing Period</label>
                <Select value={formData.billing_period} onValueChange={(v) => setFormData({...formData, billing_period: v})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Price (USD)</label>
              <Input
                type="number"
                value={formData.price_usd}
                onChange={(e) => setFormData({...formData, price_usd: parseFloat(e.target.value)})}
                className="mt-2"
                step="0.01"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Featured Plan</label>
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
              />
            </div>

            <Button
              onClick={() => savePlanMutation.mutate()}
              disabled={!formData.plan_id || !formData.name || savePlanMutation.isPending}
              className="w-full"
            >
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}