'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, Card, CardContent, Button, Input } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  committee?: {
    id: string;
    name: string;
    nameNepali?: string;
  };
  minutes?: {
    agenda?: string;
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

interface PendingAgendaItem {
  id: string;
  type: string;
  title: string;
  description: string;
  memberId: string;
  memberNumber?: string;
  memberName: string;
  submittedAt?: string;
}

export default function GovernanceMeetingsPage() {
  const router = useRouter();
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [pendingAgendaItems, setPendingAgendaItems] = useState<PendingAgendaItem[]>([]);
  const [unassignedPendingItems, setUnassignedPendingItems] = useState<PendingAgendaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      fetchMeetings();
      fetchUnassignedPendingAgenda();
    }
  }, [
    authLoading,
    isAuthenticated,
    token,
    currentPage,
    typeFilter,
    statusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchMeetings();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchMeetings = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('meetingType', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);

      const response = await fetch(`${API_URL}/governance/meetings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setMeetings(data.meetings || []);
      setPagination(data.pagination || null);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      setError(error.message || 'Failed to fetch meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('meetingType', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);

      const response = await fetch(`${API_URL}/governance/meetings/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to export meetings');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meetings-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting meetings:', err);
      alert('Failed to export meetings');
    }
  };

  const fetchUnassignedPendingAgenda = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/member-workflow/pending-agenda`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUnassignedPendingItems(data.pendingAgendaItems || []);
      }
    } catch (error) {
      console.error('Error fetching pending agenda:', error);
    }
  };

  const fetchMeetingDetails = async (meetingId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMeeting(data.meeting);
        setPendingAgendaItems(data.pendingAgendaItems || []);
      }
    } catch (error) {
      console.error('Error fetching meeting details:', error);
    }
  };

  if (authLoading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
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

  if (!hasModule('governance')) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              Governance module is not enabled for your subscription plan.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Board Meetings (सञ्चालक बैठक)</h1>
            <p className="mt-1 text-sm text-gray-500">Manage board meetings and agendas</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
            <Link
              href="/governance/meetings/new"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + New Meeting
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Input
                  type="text"
                  placeholder="Search by title, description, location..."
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
                  <option value="BOD">Board Meeting</option>
                  <option value="COMMITTEE">Committee Meeting</option>
                  <option value="GENERAL">General Meeting</option>
                </select>
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
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
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

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Unassigned Pending Agenda Items */}
        {unassignedPendingItems.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Pending Agenda Items (Not Assigned to Any Meeting)
            </h2>
            <p className="text-sm text-yellow-700 mb-3">
              These members are waiting for BOD approval. Assign them to a meeting to proceed.
            </p>
            <div className="space-y-2">
              {unassignedPendingItems.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded border border-yellow-200">
                  <p className="font-medium text-gray-900">{item.memberName}</p>
                  <p className="text-sm text-gray-600">
                    {item.description} - Submitted:{' '}
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meetings List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading meetings...</p>
            </div>
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-600">
              No meetings found. Create your first meeting to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedMeeting(meeting);
                  fetchMeetingDetails(meeting.id);
                }}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{meeting.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                  {new Date(meeting.scheduledDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  {meeting.description || 'No description'}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      meeting.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : meeting.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {meeting.status}
                  </span>
                  <Link
                    href={`/governance/meetings/${meeting.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              meetings
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
