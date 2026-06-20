// src/components/ui/Skeleton.tsx
import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton rounded-lg ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    </div>
  );
}