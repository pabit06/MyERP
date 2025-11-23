'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ArrowLeft,
  Download,
  Calendar,
  Filter,
  Search,
  FileText,
  User,
  Activity,
  Clock,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

interface AuditSummary {
  total: number;
  returned: number;
  actionCounts: Array<{ action: string; count: number }>;
  entityTypeCounts: Array<{ entityType: string; count: number }>;
}

export default function AuditReportPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    limit: '1000',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditReport = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await fetch(`${API_URL}/reports/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.auditLogs || []);
        setSummary(data.summary || null);
      } else {
        console.error('Failed to fetch audit report');
        setAuditLogs([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching audit report:', error);
      setAuditLogs([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAuditReport();
    }
  }, [token]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchAuditReport();
  };

  const handleResetFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
      limit: '1000',
    });
    setSearchQuery('');
    setTimeout(() => {
      fetchAuditReport();
    }, 100);
  };

  // Filter audit logs by search query
  const filteredLogs = auditLogs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.entityType.toLowerCase().includes(query) ||
      (log.entityId && log.entityId.toLowerCase().includes(query)) ||
      (log.userId && log.userId.toLowerCase().includes(query)) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(query))
    );
  });

  // Get unique actions and entity types for filter dropdowns
  const uniqueActions = Array.from(new Set(auditLogs.map((log) => log.action))).sort();
  const uniqueEntityTypes = Array.from(new Set(auditLogs.map((log) => log.entityType))).sort();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-indigo-600" />
                    Audit Report
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Comprehensive audit trail of all system activities and user actions
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchAuditReport()}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {summary.total.toLocaleString()}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-indigo-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Displayed</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {summary.returned.toLocaleString()}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Action Types</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {summary.actionCounts.length}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entity Types</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {summary.entityTypeCounts.length}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-500 opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
                <select
                  value={filters.entityType}
                  onChange={(e) => handleFilterChange('entityType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  {uniqueEntityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="flex-1 outline-none text-sm bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="flex-1 outline-none text-sm bg-transparent"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by action, entity type, entity ID, user ID, or IP address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Audit Logs
              </h2>
              {filteredLogs.length > 0 && (
                <span className="text-sm text-gray-600">
                  Showing {filteredLogs.length} of {auditLogs.length} records
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No audit logs found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery ||
                  filters.action ||
                  filters.entityType ||
                  filters.startDate ||
                  filters.endDate
                    ? 'Try adjusting your filters or search query'
                    : 'No audit logs available for the selected criteria'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity Type
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity ID
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {log.entityType}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-mono">
                          {log.entityId || '—'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-mono">
                          {log.userId || '—'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-mono">
                          {log.ipAddress || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 text-center">
                          {log.details ? (
                            <details className="cursor-pointer">
                              <summary className="text-indigo-600 hover:text-indigo-800">
                                View Details
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-w-xs">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
