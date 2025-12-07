'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProtectedRoute,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AGM {
  id: string;
  fiscalYear: string;
  agmNumber: number;
  scheduledDate: string;
  bookCloseDate?: string;
  location?: string;
  totalMembers: number;
  presentMembers: number;
  quorumThresholdPercent: number;
  approvedDividendBonus?: number;
  approvedDividendCash?: number;
  status: string;
  notes?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planned', color: 'bg-blue-100 text-blue-800' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

export default function AGMPage() {
  const router = useRouter();
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [agms, setAgms] = useState<AGM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      fetchAGMs();
    }
  }, [
    authLoading,
    isAuthenticated,
    token,
    currentPage,
    statusFilter,
    fiscalYearFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchAGMs();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchAGMs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (fiscalYearFilter) params.append('fiscalYear', fiscalYearFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);

      const response = await fetch(`${API_URL}/governance/agm?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AGMs');
      }

      const data = await response.json();
      setAgms(data.agms || []);
      setPagination(data.pagination || null);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching AGMs:', err);
      setError(err.message || 'Failed to load AGMs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (fiscalYearFilter) params.append('fiscalYear', fiscalYearFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);

      const response = await fetch(`${API_URL}/governance/agm/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export AGMs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agms-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting AGMs:', err);
      alert('Failed to export AGMs');
    }
  };

  const calculateQuorum = (present: number, total: number, threshold: number) => {
    if (total === 0) return { met: false, percentage: 0 };
    const percentage = (present / total) * 100;
    return { met: percentage >= threshold, percentage };
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading AGMs...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <Button onClick={fetchAGMs} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AGM (साधारण सभा)</h1>
            <p className="mt-1 text-sm text-gray-500">Annual General Meetings</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
            <Button onClick={() => router.push('/governance/agm/new')}>+ New AGM</Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Input
                  type="text"
                  placeholder="Search by fiscal year, location, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Fiscal Year"
                  value={fiscalYearFilter}
                  onChange={(e) => {
                    setFiscalYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">All Status</option>
                  <option value="PLANNED">Planned</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {agms.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No AGMs found.</p>
              <Button onClick={() => router.push('/governance/agm/new')} variant="outline">
                Create First AGM
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {agms.map((agm) => {
              const quorum = calculateQuorum(
                agm.presentMembers,
                agm.totalMembers,
                agm.quorumThresholdPercent
              );
              const statusInfo = STATUS_LABELS[agm.status] || STATUS_LABELS.PLANNED;

              return (
                <Card
                  key={agm.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/governance/agm/${agm.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>
                          {agm.agmNumber}th AGM - Fiscal Year {agm.fiscalYear}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Scheduled: {new Date(agm.scheduledDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Members</p>
                        <p className="text-lg font-semibold">{agm.totalMembers}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Present</p>
                        <p className="text-lg font-semibold">{agm.presentMembers}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quorum</p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-lg font-semibold ${quorum.met ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {quorum.percentage.toFixed(1)}%
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${quorum.met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {quorum.met ? 'Met' : 'Not Met'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Threshold</p>
                        <p className="text-lg font-semibold">{agm.quorumThresholdPercent}%</p>
                      </div>
                    </div>
                    {agm.bookCloseDate && (
                      <p className="text-sm text-gray-600">
                        Book Close Date: {new Date(agm.bookCloseDate).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              AGMs
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPreviousPage}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
