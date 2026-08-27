import type { ReactNode } from 'react';

interface StatCardProps {
  className?: string;
  children: ReactNode;
}

export default function StatCard({ className = '', children }: StatCardProps) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}
