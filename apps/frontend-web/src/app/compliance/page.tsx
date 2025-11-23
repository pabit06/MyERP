'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  details?: any;
  timestamp: string;
}

export default function CompliancePage() {
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchAuditLogs = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/compliance/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setAuditLogs(data.auditLogs || []);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      setError(error.message || 'Failed to fetch audit logs');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Debug info
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please login to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasModule('compliance')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            The Compliance module is not enabled for your subscription plan.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator or run:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">pnpm run enable:compliance</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
        <p className="text-gray-600">View system activity and compliance audit trails</p>
      </div>

      {/* Quick Links to AML Features */}
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="text-lg font-semibold mb-2">AML & Compliance Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/compliance/dashboard"
            className="block p-3 bg-white rounded shadow hover:shadow-md transition"
          >
            <div className="font-semibold">🛡️ Compliance Dashboard</div>
            <div className="text-sm text-gray-600">Overview & Statistics</div>
          </Link>
          <Link
            href="/compliance/ttr-queue"
            className="block p-3 bg-white rounded shadow hover:shadow-md transition"
          >
            <div className="font-semibold">📋 TTR Queue</div>
            <div className="text-sm text-gray-600">Threshold Transaction Reports</div>
          </Link>
          <Link
            href="/compliance/cases"
            className="block p-3 bg-white rounded shadow hover:shadow-md transition"
          >
            <div className="font-semibold">🚨 Suspicious Cases</div>
            <div className="text-sm text-gray-600">AML Case Management</div>
          </Link>
          <Link
            href="/compliance/kym-status"
            className="block p-3 bg-white rounded shadow hover:shadow-md transition"
          >
            <div className="font-semibold">👤 KYM Status</div>
            <div className="text-sm text-gray-600">Know Your Member Reviews</div>
          </Link>
          <Link
            href="/compliance/risk-report"
            className="block p-3 bg-white rounded shadow hover:shadow-md transition"
          >
            <div className="font-semibold">📊 Risk Report</div>
            <div className="text-sm text-gray-600">Schedule-3 Assessment</div>
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Note: Some features require ComplianceOfficer role
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., create, update"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <input
              type="text"
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., member, loan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {error}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Check browser console for details. Make sure the backend server is running.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading audit logs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Entity ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.entityType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.entityId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.details ? (
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            View Details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
