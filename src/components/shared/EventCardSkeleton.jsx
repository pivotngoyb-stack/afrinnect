import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="w-full h-48 bg-gray-200 animate-pulse" />
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="h-5 w-24 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-1/3 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}