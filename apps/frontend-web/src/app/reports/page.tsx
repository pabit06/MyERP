'use client';

import { useRouter } from 'next/navigation';
import {
  Users,
  PiggyBank,
  Banknote,
  ArrowRight,
  FileText,
  TrendingUp,
  BarChart3,
  Shield,
} from 'lucide-react';
import { ProtectedRoute } from '@/features/components/shared';

interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
  stats?: {
    label: string;
    value: string;
  }[];
}

const reportCategories: ReportCategory[] = [
  {
    id: 'member',
    title: 'Member Reports',
    description: 'Comprehensive reports on member activities, registrations, and demographics',
    icon: Users,
    href: '/reports/member',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    stats: [
      { label: 'Total Members', value: 'Active' },
      { label: 'New This Month', value: 'Growth' },
    ],
  },
  {
    id: 'savings',
    title: 'Savings Reports',
    description: 'Detailed analysis of savings accounts, deposits, and withdrawals',
    icon: PiggyBank,
    href: '/reports/savings',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    stats: [
      { label: 'Total Savings', value: 'Balance' },
      { label: 'Active Accounts', value: 'Count' },
    ],
  },
  {
    id: 'loan',
    title: 'Loan Reports',
    description: 'Loan portfolio analysis, disbursements, collections, and NPA tracking',
    icon: Banknote,
    href: '/reports/loan',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    stats: [
      { label: 'Total Portfolio', value: 'Amount' },
      { label: 'Outstanding', value: 'Balance' },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Statements',
    description: 'Generate key financial statements like Balance Sheet, P&L, and Trial Balance',
    icon: FileText,
    href: '/reports/financial-statements',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100',
    stats: [
      { label: 'Balance Sheet', value: 'View' },
      { label: 'Profit & Loss', value: 'View' },
    ],
  },
  {
    id: 'audit',
    title: 'Audit Report',
    description: 'Track all system activities and user actions for compliance and security',
    icon: Shield,
    href: '/reports/audit',
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
    stats: [
      { label: 'Total Events', value: 'Count' },
      { label: 'Security Alerts', value: 'High' },
    ],
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                  Financial Reports
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Access comprehensive reports and analytics for your cooperative
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Report Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {reportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.id}
                  onClick={() => router.push(category.href)}
                  className={`${category.bgColor} rounded-xl p-6 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-300 hover:shadow-lg group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`p-3 rounded-lg ${category.color.replace('text-', 'bg-').replace('-600', '-100')}`}
                    >
                      <Icon className={`w-6 h-6 ${category.color}`} />
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 ${category.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                    />
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.title}</h3>

                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>

                  {category.stats && (
                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      {category.stats.map((stat, idx) => (
                        <div key={idx}>
                          <p className="text-xs text-gray-500">{stat.label}</p>
                          <p className={`text-sm font-semibold ${category.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Stats Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Quick Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Loan Portfolio</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-indigo-600">-</p>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-indigo-50 rounded-xl p-6 border border-indigo-100">
            <div className="flex items-start gap-4">
              <FileText className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">Need Help?</h3>
                <p className="text-sm text-indigo-700">
                  Select a report category above to view detailed reports. Each category provides
                  comprehensive analytics and insights for better decision-making. Reports can be
                  filtered by date range, member groups, and other criteria.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
