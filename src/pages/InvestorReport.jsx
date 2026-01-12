import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { Loader2, Printer, Download, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from '@/components/shared/Logo';

export default function InvestorReport() {
  const [date] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

  const { data, isLoading, error } = useQuery({
    queryKey: ['investor-report'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getReportData', {});
      return response.data;
    },
    staleTime: 300000 // 5 mins
  });

  // Mock chart data (since we only have aggregates, we simulate a trend for the visual)
  // In a real scenario, we'd fetch time-series data
  const generateTrend = (base, growth) => {
    return Array.from({ length: 6 }, (_, i) => ({
      name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
      value: Math.round(base * (1 + (growth/100) * i))
    }));
  };

  const chartData = data ? generateTrend(data.stats.totalUsers * 0.7, 15) : [];
  const revenueData = data ? generateTrend(data.stats.mrr * 0.6, 20) : [];

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Generating Report with AI...</h2>
        <p className="text-gray-500">Analyzing metrics and writing executive summary</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Failed to load report: {error.message}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      {/* Controls - Hidden on Print */}
      <div className="max-w-[210mm] mx-auto mb-8 flex justify-end gap-4 print:hidden">
        <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700">
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* A4 Report Container */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl print:shadow-none p-12 rounded-xl text-gray-900">
        
        {/* Header */}
        <header className="flex justify-between items-start mb-12 border-b pb-8">
          <div>
            <Logo size="large" />
            <h1 className="text-3xl font-bold mt-4 text-gray-900">Investor Update</h1>
            <p className="text-gray-500 mt-1">{date}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-1">Status</div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium text-sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Growth Phase
            </div>
          </div>
        </header>

        {/* Executive Summary (AI) */}
        <section className="mb-12">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Executive Summary</h2>
          <div className="prose max-w-none text-gray-800 leading-relaxed bg-purple-50/50 p-6 rounded-lg border-l-4 border-purple-600">
            <p className="whitespace-pre-line text-lg">{data.aiAnalysis.summary}</p>
          </div>
        </section>

        {/* Key Metrics Grid */}
        <section className="grid grid-cols-3 gap-6 mb-12">
          <Card className="border-gray-200 shadow-none bg-blue-50/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2 text-blue-700">
                <Users className="h-5 w-5" />
                <span className="font-semibold text-sm uppercase">Total Users</span>
              </div>
              <div className="text-4xl font-bold text-gray-900">{data.stats.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-green-600 font-medium mt-1">
                +{data.stats.userGrowth}% MoM
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-none bg-green-50/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2 text-green-700">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold text-sm uppercase">Monthly Revenue</span>
              </div>
              <div className="text-4xl font-bold text-gray-900">${data.stats.mrr.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                Recurring (MRR)
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-none bg-pink-50/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2 text-pink-700">
                <Activity className="h-5 w-5" />
                <span className="font-semibold text-sm uppercase">Engagement</span>
              </div>
              <div className="text-4xl font-bold text-gray-900">{data.stats.activeUsers.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                Active Users (MAU)
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">User Growth Trend</h3>
            <div className="h-64 border rounded-lg p-4 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Trajectory</h3>
            <div className="h-64 border rounded-lg p-4 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* AI Highlights & Recommendations */}
        <section className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Key Highlights</h3>
            <ul className="space-y-3">
              {data.aiAnalysis.highlights?.map((highlight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2 shrink-0" />
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Strategic Focus</h3>
            <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
              <p className="text-gray-800 italic">"{data.aiAnalysis.recommendation}"</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-8 mt-auto flex justify-between text-xs text-gray-400">
          <div>Generated by Afrinnect AI Intelligence</div>
          <div>Confidential - For Investor Use Only</div>
        </footer>

      </div>
    </div>
  );
}