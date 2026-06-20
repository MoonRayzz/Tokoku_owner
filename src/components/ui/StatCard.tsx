import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, trend, trendUp, icon }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:border-border-muted transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 text-text-secondary">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-text-primary mb-2">{value}</div>
        {trend && (
          <div className={`flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-md text-sm ${trendUp ? 'text-primary-container bg-primary-container/10' : 'text-error bg-error/10'}`}>
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}
