'use client';

import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  height?: number;
  emptyMessage?: string;
}

export default function ChartWrapper({
  children,
  isLoading = false,
  isEmpty = false,
  height = 300,
  emptyMessage = 'No data available',
}: ChartWrapperProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height: `${height}px` }}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
}
