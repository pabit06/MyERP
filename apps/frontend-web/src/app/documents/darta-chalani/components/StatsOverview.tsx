import React from 'react';

interface StatsOverviewProps {
  dartaCount: number;
  chalaniCount: number;
  pendingCount: number;
}

export default function StatsOverview({ dartaCount, chalaniCount, pendingCount }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Darta Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-green-50 to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Darta</h3>
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{dartaCount}</span>
            <span className="text-sm text-green-600 font-medium">Records</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Incoming documents registered</p>
        </div>
      </div>

      {/* Chalani Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-50 to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Chalani</h3>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{chalaniCount}</span>
            <span className="text-sm text-blue-600 font-medium">Records</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Outgoing documents dispatched</p>
        </div>
      </div>

      {/* Pending Action Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-orange-50 to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Pending Actions</h3>
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{pendingCount}</span>
            <span className="text-sm text-orange-600 font-medium">Requires Attention</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Documents needing immediate action</p>
        </div>
      </div>
    </div>
  );
}

