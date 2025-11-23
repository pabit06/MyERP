'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface DashboardStats {
  pendingTtrs: number;
  openCases: number;
  expiredKym: number;
  highRiskMembers: number;
}

export default function ComplianceDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        const [ttrRes, casesRes, kymRes, riskRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/ttr?status=pending`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/cases?status=open`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/kym-status?expired=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/risk-report`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [ttrData, casesData, kymData, riskData] = await Promise.all([
          ttrRes.json(),
          casesRes.json(),
          kymRes.json(),
          riskRes.json(),
        ]);

        setStats({
          pendingTtrs: ttrData.count || 0,
          openCases: casesData.count || 0,
          expiredKym: kymData.count || 0,
          highRiskMembers: riskData.report?.byRiskCategory?.high || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <ProtectedRoute requiredModule="compliance">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Compliance Dashboard</h1>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Pending TTRs</h3>
              <p className="text-3xl font-bold text-orange-600">{stats?.pendingTtrs || 0}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Open Cases</h3>
              <p className="text-3xl font-bold text-red-600">{stats?.openCases || 0}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Expired KYM</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats?.expiredKym || 0}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">High-Risk Members</h3>
              <p className="text-3xl font-bold text-purple-600">{stats?.highRiskMembers || 0}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href="/compliance/ttr-queue"
                className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View TTR Queue
              </a>
              <a
                href="/compliance/cases"
                className="block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                View Suspicious Cases
              </a>
              <a
                href="/compliance/kym-status"
                className="block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                View KYM Status
              </a>
              <a
                href="/compliance/risk-report"
                className="block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Generate Risk Report
              </a>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
