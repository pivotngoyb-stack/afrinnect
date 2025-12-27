import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, TrendingUp, Users, Target, BarChart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ABTestDashboard() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = createPageUrl('Landing');
      }
      setUser(currentUser);
    };
    checkAuth();
  }, []);

  const { data: tests = [] } = useQuery({
    queryKey: ['ab-tests'],
    queryFn: () => base44.entities.ABTest.filter({}, '-created_date'),
    enabled: !!user
  });

  const activeTests = tests.filter(t => t.status === 'active');
  const completedTests = tests.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">A/B Testing</h1>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600">
            <Plus size={18} className="mr-2" />
            New Test
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Target size={32} className="mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold">{activeTests.length}</p>
              <p className="text-sm text-gray-500">Active Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart size={32} className="mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold">{completedTests.length}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp size={32} className="mx-auto text-amber-600 mb-2" />
              <p className="text-3xl font-bold">
                {tests.length > 0 ? Math.round((tests.filter(t => t.winning_variant).length / tests.length) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500">Success Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Tests List */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Tests</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeTests.map(test => (
              <TestCard key={test.id} test={test} />
            ))}
            {activeTests.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No active tests. Create one to start optimizing!
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedTests.map(test => (
              <TestCard key={test.id} test={test} />
            ))}
            {completedTests.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No completed tests yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTestModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries(['ab-tests']);
          }}
        />
      )}
    </div>
  );
}

function TestCard({ test }) {
  const variantA = test.variants?.find(v => v.name === 'A');
  const variantB = test.variants?.find(v => v.name === 'B');
  
  const totalViews = (variantA?.views || 0) + (variantB?.views || 0);
  const conversionRateA = variantA?.views > 0 ? (variantA.conversions / variantA.views * 100).toFixed(1) : 0;
  const conversionRateB = variantB?.views > 0 ? (variantB.conversions / variantB.views * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{test.test_name}</CardTitle>
          <Badge variant={test.status === 'active' ? 'default' : 'outline'}>
            {test.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Variant A */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Variant A</span>
                {test.winning_variant === 'A' && (
                  <Badge className="bg-green-600">Winner</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{variantA?.description}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Views:</span>
                  <span className="font-medium">{variantA?.views || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conversions:</span>
                  <span className="font-medium">{variantA?.conversions || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Rate:</span>
                  <span className="text-blue-600">{conversionRateA}%</span>
                </div>
              </div>
            </div>

            {/* Variant B */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Variant B</span>
                {test.winning_variant === 'B' && (
                  <Badge className="bg-green-600">Winner</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{variantB?.description}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Views:</span>
                  <span className="font-medium">{variantB?.views || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conversions:</span>
                  <span className="font-medium">{variantB?.conversions || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Rate:</span>
                  <span className="text-purple-600">{conversionRateB}%</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Total Sample Size</span>
              <span className="font-medium">{totalViews} / {test.sample_size || 1000}</span>
            </div>
            <Progress value={(totalViews / (test.sample_size || 1000)) * 100} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTestModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    test_name: '',
    description: '',
    test_type: 'pricing',
    sample_size: 1000,
    variants: [
      { name: 'A', description: '', config: {} },
      { name: 'B', description: '', config: {} }
    ]
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ABTest.create({
      ...data,
      status: 'active',
      variants: data.variants.map(v => ({ ...v, views: 0, conversions: 0 }))
    }),
    onSuccess: onCreated
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create A/B Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Test Name</Label>
            <Input
              value={formData.test_name}
              onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
              placeholder="e.g., Premium Pricing Test"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What are you testing?"
            />
          </div>

          <div>
            <Label>Sample Size</Label>
            <Input
              type="number"
              value={formData.sample_size}
              onChange={(e) => setFormData({ ...formData, sample_size: parseInt(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Variant A Description</Label>
              <Input
                value={formData.variants[0].description}
                onChange={(e) => {
                  const newVariants = [...formData.variants];
                  newVariants[0].description = e.target.value;
                  setFormData({ ...formData, variants: newVariants });
                }}
                placeholder="Control/Original"
              />
            </div>
            <div>
              <Label>Variant B Description</Label>
              <Input
                value={formData.variants[1].description}
                onChange={(e) => {
                  const newVariants = [...formData.variants];
                  newVariants[1].description = e.target.value;
                  setFormData({ ...formData, variants: newVariants });
                }}
                placeholder="New version"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.test_name || createMutation.isPending}
              className="bg-purple-600"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Test'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}