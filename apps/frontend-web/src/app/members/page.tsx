'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import MemberGrowthChart from '../../components/charts/MemberGrowthChart';
import StatusDistributionChart from '../../components/charts/StatusDistributionChart';
import WorkflowBreakdownChart from '../../components/charts/WorkflowBreakdownChart';
import DemographicChart from '../../components/charts/DemographicChart';
import GeographicChart from '../../components/charts/GeographicChart';
import TrendsChart from '../../components/charts/TrendsChart';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SummaryData {
  totalMembers: number;
  activeMembers: number;
  pendingKYC: number;
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [summary, setSummary] = useState<SummaryData>({
    totalMembers: 0,
    activeMembers: 0,
    pendingKYC: 0,
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/members/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [token]);

  // Calculate new this week
  const newThisWeek = 0; // This would need to be calculated from the charts data

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Member Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Analytics and insights for member management
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/members/all"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              View All Members
            </Link>
            <button
              onClick={() => router.push('/members/new')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Add Member
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Members</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {isLoadingSummary ? '...' : summary.totalMembers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Members</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {isLoadingSummary ? '...' : summary.activeMembers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Approval</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {isLoadingSummary ? '...' : summary.pendingKYC}
                    </dd>
                    <dd className="text-xs text-gray-500 mt-1">
                      <Link
                        href="/members/kyc-approvals"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Review →
                      </Link>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">New This Week</dt>
                    <dd className="text-lg font-semibold text-gray-900">{newThisWeek}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Growth Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Member Growth (Last 90 Days)
            </h2>
            <MemberGrowthChart />
          </div>

          {/* Status Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status Distribution</h2>
            <StatusDistributionChart />
          </div>
        </div>

        {/* Workflow Breakdown */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Status Breakdown</h2>
          <WorkflowBreakdownChart />
        </div>

        {/* Demographic Charts */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Demographics</h2>
          <DemographicChart />
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Geographic Distribution (Top 10 States)
          </h2>
          <GeographicChart />
        </div>

        {/* Latest Trends */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Trends</h2>
          <TrendsChart />
        </div>
      </div>
    </ProtectedRoute>
  );
}
