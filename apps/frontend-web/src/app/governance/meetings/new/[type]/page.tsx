'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import { useAuth } from '../../../../../contexts/AuthContext';
import Link from 'next/link';
import NepaliDatePicker from '../../../../../components/NepaliDatePicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

const MEETING_TYPE_LABELS: Record<string, string> = {
  board: 'Board Meeting',
  general: 'General Meeting',
  committee: 'Committee Meeting',
  other: 'Other Meeting',
};

export default function CreateMeetingByTypePage() {
  const router = useRouter();
  const params = useParams();
  const meetingType = params.type as string;
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAgendaItems, setPendingAgendaItems] = useState<PendingAgendaItem[]>([]);
  const [selectedAgendaItems, setSelectedAgendaItems] = useState<string[]>([]);

  const [committees, setCommittees] = useState<any[]>([]);
  const [loadingCommittees, setLoadingCommittees] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    date: '', // New field name
    startTime: '',
    endTime: '',
    location: '',
    committeeId: '',
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      // Only fetch pending agenda items for board meetings
      if (meetingType === 'board') {
        fetchPendingAgendaItems();
      }
      // Fetch committees for committee selection
      if (meetingType === 'committee' || meetingType === 'board') {
        fetchCommittees();
      }
    }
  }, [authLoading, isAuthenticated, token, meetingType]);

  const fetchCommittees = async () => {
    if (!token) return;
    try {
      setLoadingCommittees(true);
      const response = await fetch(`${API_URL}/governance/committees?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCommittees(data.committees || []);
      }
    } catch (error) {
      console.error('Error fetching committees:', error);
    } finally {
      setLoadingCommittees(false);
    }
  };

  const fetchPendingAgendaItems = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/member-workflow/pending-agenda`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingAgendaItems(data.pendingAgendaItems || []);
      }
    } catch (error) {
      console.error('Error fetching pending agenda items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/governance/meetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          date: formData.date || formData.scheduledDate, // Use date if provided, fallback to scheduledDate
          meetingType,
          committeeId: formData.committeeId || undefined,
          assignPendingAgendaItems:
            meetingType === 'board' && selectedAgendaItems.length > 0
              ? selectedAgendaItems
              : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.details
          ? `${errorData.error || 'Failed to create meeting'}: ${errorData.details}`
          : errorData.error || 'Failed to create meeting';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      router.push(`/governance/meetings/${data.meeting.id}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setError(error.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgendaItem = (memberId: string) => {
    setSelectedAgendaItems((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
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

  if (!meetingType || !MEETING_TYPE_LABELS[meetingType]) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="space-y-6">
          <Link
            href="/governance/meetings/new"
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            ← Back to Meeting Types
          </Link>
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">Invalid meeting type</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/governance/meetings/new"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Meeting Types
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Create {MEETING_TYPE_LABELS[meetingType]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Fill in the details to create a new meeting</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meeting Details */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Meeting Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder={`e.g., ${MEETING_TYPE_LABELS[meetingType]} - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Meeting description..."
              />
            </div>

            {(meetingType === 'committee' || meetingType === 'board') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
                <select
                  value={formData.committeeId}
                  onChange={(e) => setFormData({ ...formData, committeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a committee (optional)</option>
                  {loadingCommittees ? (
                    <option>Loading committees...</option>
                  ) : (
                    committees.map((committee) => (
                      <option key={committee.id} value={committee.id}>
                        {committee.name} {committee.nameNepali ? `(${committee.nameNepali})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Selecting a committee will automatically add its active members as attendees with
                  default allowance.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <NepaliDatePicker
                  value={formData.scheduledDate}
                  onChange={(dateString) =>
                    setFormData({
                      ...formData,
                      scheduledDate: dateString,
                      date: dateString,
                    })
                  }
                  label="Scheduled Date"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Meeting location..."
                />
              </div>
            </div>
          </div>

          {/* Assign Pending Agenda Items - Only for Board Meetings */}
          {meetingType === 'board' && pendingAgendaItems.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Assign Pending Agenda Items (सदस्यता अनुमोदन)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Select members to add to this meeting's agenda for approval.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingAgendaItems.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedAgendaItems.includes(item.memberId)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleAgendaItem(item.memberId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedAgendaItems.includes(item.memberId)}
                            onChange={() => toggleAgendaItem(item.memberId)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <p className="font-medium text-gray-900">{item.memberName}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 ml-6">{item.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2 ml-6">
                          <span>Member #: {item.memberNumber || 'Pending'}</span>
                          {item.submittedAt && (
                            <span>
                              Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedAgendaItems.length > 0 && (
                <p className="mt-4 text-sm text-indigo-600">
                  {selectedAgendaItems.length} item(s) selected
                </p>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Meeting'}
            </button>
            <Link
              href="/governance/meetings"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
