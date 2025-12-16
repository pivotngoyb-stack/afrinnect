import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Smartphone, Monitor } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CustomerView() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState('mobile');

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        if (user && user.email === 'pivotngoyb@gmail.com') {
          setIsAdmin(true);
        } else {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    checkAdmin();
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  const pages = [
    { name: 'Landing', label: 'Landing Page', url: createPageUrl('Landing') },
    { name: 'Home', label: 'Discovery Feed', url: createPageUrl('Home') },
    { name: 'Matches', label: 'Matches & Likes', url: createPageUrl('Matches') },
    { name: 'Events', label: 'Events', url: createPageUrl('Events') },
    { name: 'Profile', label: 'User Profile', url: createPageUrl('Profile') },
    { name: 'PricingPlans', label: 'Pricing Plans', url: createPageUrl('PricingPlans') }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={24} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Customer View</h1>
              <p className="text-sm text-gray-500">Preview the user experience</p>
            </div>
          </div>

          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="mobile" className="gap-2">
                <Smartphone size={18} />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="desktop" className="gap-2">
                <Monitor size={18} />
                Desktop
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page, idx) => (
            <motion.div
              key={page.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link to={page.url} target="_blank">
                <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all overflow-hidden group cursor-pointer">
                  <div className="aspect-[9/16] bg-gradient-to-br from-purple-50 to-amber-50 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Eye size={48} className="text-purple-300 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                        Preview
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">{page.label}</h3>
                    <p className="text-sm text-gray-500">View as customer</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-2">💡 Preview Mode</h3>
          <p className="text-blue-800 text-sm">
            Click on any page to open it in a new tab and see exactly what your customers see. 
            This helps you understand the user experience and identify areas for improvement.
          </p>
        </div>
      </main>
    </div>
  );
}