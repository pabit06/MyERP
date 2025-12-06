'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Committee {
  id: string;
  name: string;
  nameNepali?: string;
  description?: string;
  type: string;
  isStatutory: boolean;
  _count?: {
    members: number;
    tenures: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const COMMITTEE_TYPE_LABELS: Record<string, { label: string; labelNepali: string; icon: string }> =
  {
    BOD: { label: 'Board of Directors', labelNepali: 'सञ्चालक समिति', icon: '👔' },
    ACCOUNT: { label: 'Account Committee', labelNepali: 'लेखा समिति', icon: '📊' },
    LOAN: { label: 'Loan Committee', labelNepali: 'ऋण उप-समिति', icon: '💰' },
    EDUCATION: { label: 'Education Committee', labelNepali: 'शिक्षा उप-समिति', icon: '📚' },
    OTHER: { label: 'Other Committee', labelNepali: 'अन्य समिति', icon: '📋' },
  };

export default function CommitteesPage() {
  const router = useRouter();
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statutoryFilter, setStatutoryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      fetchCommittees();
    }
  }, [authLoading, isAuthenticated, token, currentPage, typeFilter, statutoryFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchCommittees();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCommittees = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('type', typeFilter);
      if (statutoryFilter) params.append('isStatutory', statutoryFilter);

      const response = await fetch(`${API_URL}/governance/committees?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          errorData.error ||
            `Failed to fetch committees (${response.status} ${response.statusText})`
        );
      }

      const data = await response.json();
      setCommittees(data.committees || []);
      setPagination(data.pagination || null);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching committees:', err);
      setError(
        err.message || 'Failed to load committees. Please check if the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('type', typeFilter);
      if (statutoryFilter) params.append('isStatutory', statutoryFilter);

      const response = await fetch(`${API_URL}/governance/committees/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export committees');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `committees-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting committees:', err);
      alert('Failed to export committees');
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading committees...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    const isModuleError =
      error.includes('not enabled') || error.includes('403') || error.includes('Module');
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold mb-2">Error: {error}</p>
            {isModuleError && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Governance module is not enabled</strong> for your subscription plan.
                </p>
                <p className="text-xs text-yellow-700 mb-2">
                  To enable the governance module, run this command from the project root:
                </p>
                <code className="block mt-2 p-2 bg-yellow-100 rounded text-xs font-mono">
                  pnpm --filter @myerp/backend enable:governance [cooperativeId]
                </code>
                <p className="text-xs text-yellow-700 mt-2">
                  Or visit the Subscription page to upgrade your plan.
                </p>
              </div>
            )}
            <Button onClick={fetchCommittees} className="mt-4" variant="outline">
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
            <h1 className="text-3xl font-bold text-gray-900">Committees (समिति तथा उप-समिति)</h1>
            <p className="mt-1 text-sm text-gray-500">Manage committees and their members</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
            <Button onClick={() => router.push('/governance/committees/new')}>
              + New Committee
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  type="text"
                  placeholder="Search by name, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">All Types</option>
                  {Object.entries(COMMITTEE_TYPE_LABELS).map(([value, info]) => (
                    <option key={value} value={value}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={statutoryFilter}
                  onChange={(e) => {
                    setStatutoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">All Committees</option>
                  <option value="true">Statutory Only</option>
                  <option value="false">Non-Statutory Only</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {committees.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No committees found.</p>
              <Button onClick={() => router.push('/governance/committees/new')} variant="outline">
                Create First Committee
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {committees.map((committee) => {
              const typeInfo = COMMITTEE_TYPE_LABELS[committee.type] || COMMITTEE_TYPE_LABELS.OTHER;
              return (
                <Card
                  key={committee.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/governance/committees/${committee.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{typeInfo.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{committee.name}</CardTitle>
                          {committee.nameNepali && (
                            <p className="text-sm text-gray-600 mt-1">{committee.nameNepali}</p>
                          )}
                        </div>
                      </div>
                      {committee.isStatutory && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Statutory
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {committee.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {committee.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {committee._count?.members || 0}{' '}
                        {committee._count?.members === 1 ? 'Member' : 'Members'}
                      </span>
                      <span>{committee._count?.tenures || 0} Tenures</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-gray-400">{typeInfo.labelNepali}</span>
                    </div>
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
              committees
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
