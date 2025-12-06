'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: string;
  meetingNo?: number;
  date?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  workflowStatus: string;
  baseAllowance?: number;
  totalExpense?: number;
  minutesFileUrl?: string;
  committee?: {
    id: string;
    name: string;
    nameNepali?: string;
    defaultAllowanceRate?: number;
  };
  agendas?: MeetingAgenda[];
  meetingAttendees?: MeetingAttendee[];
}

interface MeetingAgenda {
  id: string;
  title: string;
  description?: string;
  decision?: string;
  decisionStatus: string;
  order: number;
}

interface MeetingAttendee {
  id: string;
  committeeMemberId?: string;
  name?: string;
  role?: string;
  isPresent: boolean;
  allowance: number;
  tdsAmount: number;
  netAmount: number;
  committeeMember?: {
    member?: {
      id: string;
      memberNumber?: string;
      firstName?: string;
      lastName?: string;
      middleName?: string;
      institutionName?: string;
      memberType?: string;
    };
  };
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

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, hasModule, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'agenda' | 'attendance' | 'minutes'>('agenda');
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAgendaItems, setPendingAgendaItems] = useState<PendingAgendaItem[]>([]);
  const [unassignedPendingAgendaItems, setUnassignedPendingAgendaItems] = useState<
    PendingAgendaItem[]
  >([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PendingAgendaItem | null>(null);
  const [approvalDate, setApprovalDate] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Agenda state
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaDescription, setNewAgendaDescription] = useState('');
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editingAgendaTitle, setEditingAgendaTitle] = useState('');
  const [editingAgendaDescription, setEditingAgendaDescription] = useState('');

  // Attendance state
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [newInviteeName, setNewInviteeName] = useState('');
  const [newInviteeRole, setNewInviteeRole] = useState('Invitee');
  const [newInviteeAllowance, setNewInviteeAllowance] = useState('');
  const [addingInvitee, setAddingInvitee] = useState(false);

  // Minutes state
  const [agendaDecisions, setAgendaDecisions] = useState<
    Record<string, { decision: string; decisionStatus: string }>
  >({});
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Action buttons
  const [scheduling, setScheduling] = useState(false);
  const [startingMeeting, setStartingMeeting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Report attachment
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [attachedReports, setAttachedReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [attachingReport, setAttachingReport] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && token && params.id) {
      fetchMeetingDetails();
      fetchAvailableReports();
    }
  }, [authLoading, isAuthenticated, token, params.id]);

  useEffect(() => {
    if (meeting?.agendas) {
      const decisions: Record<string, { decision: string; decisionStatus: string }> = {};
      meeting.agendas.forEach((agenda) => {
        decisions[agenda.id] = {
          decision: agenda.decision || '',
          decisionStatus: agenda.decisionStatus || 'PENDING',
        };
      });
      setAgendaDecisions(decisions);
    }
    if (meeting?.meetingAttendees) {
      setAttendees(meeting.meetingAttendees);
    }
  }, [meeting]);

  const fetchMeetingDetails = async () => {
    if (!token || !params.id) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setMeeting(data.meeting);
      setPendingAgendaItems(data.pendingAgendaItems || []);
      setUnassignedPendingAgendaItems(data.unassignedPendingAgendaItems || []);
      setError(null);

      // Fetch attached reports
      if (data.meeting?.managerReports) {
        setAttachedReports(data.meeting.managerReports);
      }
    } catch (error: any) {
      console.error('Error fetching meeting details:', error);
      setError(error.message || 'Failed to fetch meeting details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableReports = async () => {
    if (!token || !params.id) return;
    try {
      setLoadingReports(true);
      const response = await fetch(
        `${API_URL}/governance/meetings/${params.id}/available-reports`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching available reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleAttachReport = async () => {
    if (!token || !params.id || !selectedReportId) return;
    setAttachingReport(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/attach-report`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId: selectedReportId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to attach report');
      }

      await fetchMeetingDetails();
      await fetchAvailableReports();
      setSelectedReportId('');
      alert('Report attached successfully!');
    } catch (error: any) {
      alert(error.message || 'Error attaching report');
    } finally {
      setAttachingReport(false);
    }
  };

  const handleSchedule = async () => {
    if (!token || !params.id) return;
    setScheduling(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule meeting');
      }

      await fetchMeetingDetails();
      alert('Meeting scheduled successfully! Notifications sent to attendees.');
    } catch (error: any) {
      alert(error.message || 'Error scheduling meeting');
    } finally {
      setScheduling(false);
    }
  };

  const handleStartMeeting = async () => {
    if (!token || !params.id) return;
    setStartingMeeting(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          workflowStatus: 'MINUTED',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start meeting');
      }

      await fetchMeetingDetails();
    } catch (error: any) {
      alert(error.message || 'Error starting meeting');
    } finally {
      setStartingMeeting(false);
    }
  };

  const handleAddAgenda = async () => {
    if (!token || !params.id || !newAgendaTitle.trim()) return;
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/agenda`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newAgendaTitle,
          description: newAgendaDescription || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add agenda');
      }

      setNewAgendaTitle('');
      setNewAgendaDescription('');
      await fetchMeetingDetails();
    } catch (error: any) {
      alert(error.message || 'Error adding agenda');
    }
  };

  const handleUpdateAgenda = async (agendaId: string) => {
    if (!token || !params.id) return;
    try {
      const response = await fetch(
        `${API_URL}/governance/meetings/${params.id}/agenda/${agendaId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editingAgendaTitle,
            description: editingAgendaDescription,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agenda');
      }

      setEditingAgendaId(null);
      setEditingAgendaTitle('');
      setEditingAgendaDescription('');
      await fetchMeetingDetails();
    } catch (error: any) {
      alert(error.message || 'Error updating agenda');
    }
  };

  const handleDeleteAgenda = async (agendaId: string) => {
    if (!token || !params.id) return;
    if (!confirm('Are you sure you want to delete this agenda item?')) return;
    try {
      const response = await fetch(
        `${API_URL}/governance/meetings/${params.id}/agenda/${agendaId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agenda');
      }

      await fetchMeetingDetails();
    } catch (error: any) {
      alert(error.message || 'Error deleting agenda');
    }
  };

  const handleUpdateAttendee = (attendeeId: string, field: string, value: any) => {
    setAttendees((prev) =>
      prev.map((att) => {
        if (att.id === attendeeId) {
          const updated = { ...att, [field]: value };
          if (field === 'allowance') {
            const allowance = Number(value) || 0;
            updated.tdsAmount = allowance * 0.15;
            updated.netAmount = allowance * 0.85;
          }
          return updated;
        }
        return att;
      })
    );
  };

  const handleSaveAttendance = async () => {
    if (!token || !params.id) return;
    setSavingAttendance(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/attendance`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: attendees.map((att) => ({
            id: att.id,
            isPresent: att.isPresent,
            allowance: att.allowance,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendance');
      }

      await fetchMeetingDetails();
      alert('Attendance saved successfully!');
    } catch (error: any) {
      alert(error.message || 'Error saving attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAddInvitee = async () => {
    if (!token || !params.id || !newInviteeName.trim()) return;
    setAddingInvitee(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/attendees`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newInviteeName,
          role: newInviteeRole,
          allowance: Number(newInviteeAllowance) || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add invitee');
      }

      setNewInviteeName('');
      setNewInviteeRole('Invitee');
      setNewInviteeAllowance('');
      await fetchMeetingDetails();
    } catch (error: any) {
      alert(error.message || 'Error adding invitee');
    } finally {
      setAddingInvitee(false);
    }
  };

  const handleSaveMinutes = async () => {
    if (!token || !params.id) return;
    setSavingMinutes(true);
    try {
      const agendas = Object.entries(agendaDecisions).map(([id, data]) => ({
        id,
        decision: data.decision,
        decisionStatus: data.decisionStatus,
      }));

      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/minutes`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agendas }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save minutes');
      }

      await fetchMeetingDetails();
      alert('Minutes saved successfully!');
    } catch (error: any) {
      alert(error.message || 'Error saving minutes');
    } finally {
      setSavingMinutes(false);
    }
  };

  const handleUploadFile = async () => {
    if (!token || !params.id || !selectedFile) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${API_URL}/governance/meetings/${params.id}/upload-minutes-file`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      await fetchMeetingDetails();
      setSelectedFile(null);
      alert('File uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFinalize = async () => {
    if (!token || !params.id) return;
    if (
      !confirm(
        'Are you sure you want to finalize this meeting? Once finalized, no changes can be made and accounting entries will be created.'
      )
    ) {
      return;
    }
    setFinalizing(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}/finalize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize meeting');
      }

      await fetchMeetingDetails();
      alert('Meeting finalized successfully! Accounting entries have been created.');
    } catch (error: any) {
      alert(error.message || 'Error finalizing meeting');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !params.id) return;
    if (
      !confirm(
        'Are you sure you want to delete this meeting? Pending agenda items will be moved back to the pending list.'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/governance/meetings/${params.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete meeting');
      }

      alert(
        'Meeting deleted successfully. Pending agenda items have been moved back to the pending list.'
      );
      router.push('/governance/meetings');
    } catch (error: any) {
      alert(error.message || 'Error deleting meeting');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800';
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWorkflowStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'LOCKED':
        return 'bg-yellow-100 text-yellow-800';
      case 'MINUTED':
        return 'bg-blue-100 text-blue-800';
      case 'FINALIZED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionButton = () => {
    if (!meeting) return null;

    const isPlanned = meeting.status === 'PLANNED' && meeting.workflowStatus === 'DRAFT';
    const isScheduled = meeting.status === 'SCHEDULED' && meeting.workflowStatus === 'LOCKED';
    const isMinuted = meeting.status === 'COMPLETED' && meeting.workflowStatus === 'MINUTED';
    const isFinalized = meeting.workflowStatus === 'FINALIZED';

    if (isFinalized) {
      return (
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
        >
          Meeting Finalized
        </button>
      );
    }

    if (isPlanned) {
      return (
        <button
          onClick={handleSchedule}
          disabled={scheduling}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {scheduling ? 'Scheduling...' : 'Finalize Schedule & Notify'}
        </button>
      );
    }

    if (isScheduled) {
      return (
        <button
          onClick={handleStartMeeting}
          disabled={startingMeeting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {startingMeeting ? 'Starting...' : 'Start Meeting'}
        </button>
      );
    }

    if (isMinuted) {
      return (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {finalizing ? 'Finalizing...' : 'Finalize & Lock Meeting'}
        </button>
      );
    }

    return null;
  };

  const isDraft = meeting?.workflowStatus === 'DRAFT';
  const isLocked = meeting?.workflowStatus === 'LOCKED';
  const isFinalized = meeting?.workflowStatus === 'FINALIZED';

  if (authLoading || loading) {
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

  if (!isAuthenticated || !hasModule('governance')) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">Please login and ensure governance module is enabled.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!meeting) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="space-y-6">
          <Link
            href="/governance/meetings"
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            ← Back to Meetings
          </Link>
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error || 'Meeting not found'}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const totalPresent = attendees.filter((a) => a.isPresent).length;
  const totalAllowance = attendees
    .filter((a) => a.isPresent)
    .reduce((sum, a) => sum + a.allowance, 0);
  const totalTDS = attendees.filter((a) => a.isPresent).reduce((sum, a) => sum + a.tdsAmount, 0);
  const totalNet = attendees.filter((a) => a.isPresent).reduce((sum, a) => sum + a.netAmount, 0);

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/governance/meetings"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Meetings
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {meeting.meetingNo ? `Meeting #${meeting.meetingNo}` : 'Meeting'}: {meeting.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {meeting.committee?.name || 'No Committee'} •{' '}
                {new Date(meeting.date || meeting.scheduledDate || '').toLocaleDateString()} •{' '}
                {meeting.meetingType}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(meeting.status)}`}
              >
                {meeting.status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getWorkflowStatusBadgeColor(meeting.workflowStatus)}`}
              >
                {meeting.workflowStatus}
              </span>
              {getActionButton()}
              {meeting.workflowStatus !== 'FINALIZED' && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  {deleting ? 'Deleting...' : 'Delete Meeting'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('agenda')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'agenda'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Setup & Agenda
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attendance'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Attendance
              </button>
              <button
                onClick={() => setActiveTab('minutes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'minutes'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Minutes & Decisions
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab 1: Setup & Agenda */}
            {activeTab === 'agenda' && (
              <div className="space-y-6">
                {/* Unassigned Pending Agenda Items */}
                {unassignedPendingAgendaItems.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Unassigned Pending Agenda Items
                    </h3>
                    <p className="text-sm text-yellow-700 mb-4">
                      Assign these members to this meeting to include them in the agenda.
                    </p>
                    <div className="space-y-3">
                      {unassignedPendingAgendaItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-4 rounded border border-yellow-200 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{item.memberName}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!token || !params.id) return;
                              try {
                                const response = await fetch(
                                  `${API_URL}/governance/meetings/${params.id}`,
                                  {
                                    method: 'PUT',
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      assignPendingAgendaItems: [item.memberId],
                                    }),
                                  }
                                );
                                if (response.ok) {
                                  await fetchMeetingDetails();
                                  alert('Agenda item assigned successfully!');
                                } else {
                                  const errorData = await response.json();
                                  alert(errorData.error || 'Failed to assign agenda item');
                                }
                              } catch (error: any) {
                                alert(error.message || 'Error assigning agenda item');
                              }
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                          >
                            Assign to Meeting
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Agenda Items (Member Approvals) - All under सदस्यता अनुमोदन */}
                {pendingAgendaItems.length > 0 && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      सदस्यता अनुमोदन (Member Approval)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The following members are pending approval for membership. All approvals are
                      grouped under this single agenda item.
                    </p>
                    <div className="space-y-3">
                      {pendingAgendaItems.map((item) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                              <h4 className="text-base font-medium text-gray-900">
                                {item.memberName}
                              </h4>
                              {item.memberNumber && (
                                <span className="text-xs text-gray-500">
                                  (Member #: {item.memberNumber})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              KYM approval for membership
                            </p>
                            {item.submittedAt && (
                              <span className="text-xs text-gray-500">
                                Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedMember(item);
                              setApprovalDate(new Date().toISOString().split('T')[0]);
                              setShowApproveModal(true);
                            }}
                            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
                          >
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meeting Details Card */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={
                          meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : ''
                        }
                        disabled={!isDraft}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isDraft ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        onChange={(e) => {
                          // Handle date update
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={meeting.location || ''}
                        disabled={!isDraft}
                        placeholder="Meeting location"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${!isDraft ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        onChange={(e) => {
                          // Handle location update
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Agenda List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Agenda Items</h3>
                    {isDraft && (
                      <button
                        onClick={handleAddAgenda}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                      >
                        + Add Agenda Item
                      </button>
                    )}
                  </div>

                  {/* Attach Manager's Report */}
                  {isDraft && availableReports.length > 0 && (
                    <div className="mb-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                      <h4 className="font-medium text-gray-900 mb-2">Attach Manager's Report</h4>
                      <div className="flex space-x-2">
                        <select
                          value={selectedReportId}
                          onChange={(e) => setSelectedReportId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select a finalized report...</option>
                          {availableReports.map((report) => (
                            <option key={report.id} value={report.id}>
                              {report.title} ({report.fiscalYear} {report.month})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAttachReport}
                          disabled={!selectedReportId || attachingReport}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                        >
                          {attachingReport ? 'Attaching...' : 'Attach'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached Reports */}
                  {attachedReports.length > 0 && (
                    <div className="mb-4 p-4 border border-green-200 rounded-lg bg-green-50">
                      <h4 className="font-medium text-gray-900 mb-2">Attached Manager's Reports</h4>
                      <div className="space-y-2">
                        {attachedReports.map((report: any) => (
                          <div
                            key={report.id}
                            className="flex items-center justify-between bg-white p-2 rounded"
                          >
                            <Link
                              href={`/governance/reports/${report.id}`}
                              className="text-indigo-600 hover:text-indigo-800 text-sm"
                            >
                              {report.title}
                            </Link>
                            <span className="text-xs text-gray-500">
                              {report.fiscalYear} {report.month}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Agenda Form */}
                  {isDraft && (
                    <div className="mb-4 p-4 border border-gray-200 rounded-lg">
                      <input
                        type="text"
                        value={newAgendaTitle}
                        onChange={(e) => setNewAgendaTitle(e.target.value)}
                        placeholder="Agenda title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                      />
                      <textarea
                        value={newAgendaDescription}
                        onChange={(e) => setNewAgendaDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                      />
                      <button
                        onClick={handleAddAgenda}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Agenda Items */}
                  <div className="space-y-3">
                    {meeting.agendas && meeting.agendas.length > 0 ? (
                      meeting.agendas.map((agenda) => (
                        <div key={agenda.id} className="border border-gray-200 rounded-lg p-4">
                          {editingAgendaId === agenda.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingAgendaTitle}
                                onChange={(e) => setEditingAgendaTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <textarea
                                value={editingAgendaDescription}
                                onChange={(e) => setEditingAgendaDescription(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleUpdateAgenda(agenda.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAgendaId(null);
                                    setEditingAgendaTitle('');
                                    setEditingAgendaDescription('');
                                  }}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900">{agenda.title}</h4>
                                    {agenda.title === 'सदस्यता अनुमोदन' && (
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        System-managed
                                      </span>
                                    )}
                                  </div>
                                  {agenda.description && (
                                    <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                                      {agenda.description}
                                    </div>
                                  )}
                                </div>
                                {isDraft && agenda.title !== 'सदस्यता अनुमोदन' && (
                                  <div className="flex space-x-2 ml-4">
                                    <button
                                      onClick={() => {
                                        setEditingAgendaId(agenda.id);
                                        setEditingAgendaTitle(agenda.title);
                                        setEditingAgendaDescription(agenda.description || '');
                                      }}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAgenda(agenda.id)}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No agenda items yet. Add one to get started.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Attendance */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Attendees</h3>
                    {!isFinalized && (
                      <button
                        onClick={handleAddInvitee}
                        disabled={addingInvitee || !newInviteeName.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                      >
                        {addingInvitee ? 'Adding...' : '+ Add Invitee'}
                      </button>
                    )}
                  </div>

                  {/* Add Invitee Form */}
                  {!isFinalized && (
                    <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          type="text"
                          value={newInviteeName}
                          onChange={(e) => setNewInviteeName(e.target.value)}
                          placeholder="Name"
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={newInviteeRole}
                          onChange={(e) => setNewInviteeRole(e.target.value)}
                          placeholder="Role"
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          value={newInviteeAllowance}
                          onChange={(e) => setNewInviteeAllowance(e.target.value)}
                          placeholder="Allowance"
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={handleAddInvitee}
                          disabled={addingInvitee || !newInviteeName.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attendees Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Role
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Present
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Allowance
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            TDS (15%)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Net Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendees.map((attendee) => {
                          const memberName = attendee.committeeMember?.member
                            ? attendee.committeeMember.member.memberType === 'INSTITUTION'
                              ? attendee.committeeMember.member.institutionName || 'Institution'
                              : `${attendee.committeeMember.member.firstName || ''} ${attendee.committeeMember.member.middleName || ''} ${attendee.committeeMember.member.lastName || ''}`.trim()
                            : attendee.name || 'Unknown';
                          return (
                            <tr key={attendee.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">{memberName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {attendee.role || 'Member'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={attendee.isPresent}
                                  onChange={(e) =>
                                    handleUpdateAttendee(attendee.id, 'isPresent', e.target.checked)
                                  }
                                  disabled={isFinalized}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  value={attendee.allowance}
                                  onChange={(e) =>
                                    handleUpdateAttendee(attendee.id, 'allowance', e.target.value)
                                  }
                                  disabled={isFinalized}
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">
                                {attendee.tdsAmount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                {attendee.netAmount.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900">
                            Total Present: {totalPresent}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {totalAllowance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {totalTDS.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                            {totalNet.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {!isFinalized && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveAttendance}
                        disabled={savingAttendance}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingAttendance ? 'Saving...' : 'Save Attendance'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Minutes & Decisions */}
            {activeTab === 'minutes' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Meeting Minutes & Decisions</h3>

                {/* Agenda Decisions */}
                <div className="space-y-4">
                  {meeting.agendas && meeting.agendas.length > 0 ? (
                    meeting.agendas.map((agenda) => (
                      <div key={agenda.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-1">{agenda.title}</h4>
                        {agenda.description && (
                          <p className="text-sm text-gray-600 mb-3">{agenda.description}</p>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Decision
                            </label>
                            <textarea
                              value={agendaDecisions[agenda.id]?.decision || ''}
                              onChange={(e) => {
                                setAgendaDecisions((prev) => ({
                                  ...prev,
                                  [agenda.id]: {
                                    ...prev[agenda.id],
                                    decision: e.target.value,
                                    decisionStatus: prev[agenda.id]?.decisionStatus || 'PENDING',
                                  },
                                }));
                              }}
                              disabled={isFinalized}
                              rows={4}
                              placeholder="Enter decision/minute text..."
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isFinalized ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              value={agendaDecisions[agenda.id]?.decisionStatus || 'PENDING'}
                              onChange={(e) => {
                                setAgendaDecisions((prev) => ({
                                  ...prev,
                                  [agenda.id]: {
                                    ...prev[agenda.id],
                                    decision: prev[agenda.id]?.decision || '',
                                    decisionStatus: e.target.value,
                                  },
                                }));
                              }}
                              disabled={isFinalized}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isFinalized ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="PASSED">Passed</option>
                              <option value="REJECTED">Rejected</option>
                              <option value="DEFERRED">Deferred</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No agenda items. Add agenda items first.
                    </p>
                  )}
                </div>

                {/* File Upload */}
                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Scanned Minute (PDF)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={isFinalized}
                      className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg ${isFinalized ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {selectedFile && (
                      <button
                        onClick={handleUploadFile}
                        disabled={uploadingFile || isFinalized}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {uploadingFile ? 'Uploading...' : 'Upload'}
                      </button>
                    )}
                  </div>
                  {meeting.minutesFileUrl && (
                    <div className="mt-2">
                      <a
                        href={`${API_URL.replace('/api', '')}${meeting.minutesFileUrl.startsWith('/') ? meeting.minutesFileUrl : '/' + meeting.minutesFileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-sm underline"
                      >
                        View uploaded file
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isFinalized && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      onClick={handleSaveMinutes}
                      disabled={savingMinutes}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingMinutes ? 'Saving...' : 'Save Minutes'}
                    </button>
                    {meeting.status === 'COMPLETED' && meeting.workflowStatus === 'MINUTED' && (
                      <button
                        onClick={handleFinalize}
                        disabled={finalizing}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {finalizing ? 'Finalizing...' : 'Finalize & Lock Meeting'}
                      </button>
                    )}
                  </div>
                )}

                {isFinalized && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <p className="text-sm text-green-700">
                      <strong>Meeting Finalized:</strong> All decisions are locked and accounting
                      entries have been created.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Approve Member Modal */}
        {showApproveModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Approve Member</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Member</p>
                  <p className="text-base text-gray-900">{selectedMember.memberName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approval Date
                  </label>
                  <input
                    type="date"
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Decision Number (निर्णय संख्या)
                  </label>
                  <input
                    type="text"
                    value={decisionNumber}
                    onChange={(e) => setDecisionNumber(e.target.value)}
                    placeholder="Enter decision number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    placeholder="Enter remarks (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={async () => {
                    if (!token || !selectedMember || !params.id) return;
                    try {
                      const response = await fetch(
                        `${API_URL}/governance/meetings/${params.id}/approve-member`,
                        {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            memberId: selectedMember.memberId,
                            approvalDate: approvalDate || new Date().toISOString(),
                            decisionNumber: decisionNumber || undefined,
                            remarks: remarks || undefined,
                          }),
                        }
                      );
                      if (response.ok) {
                        await fetchMeetingDetails();
                        setShowApproveModal(false);
                        setSelectedMember(null);
                        setApprovalDate('');
                        setDecisionNumber('');
                        setRemarks('');
                        // Trigger badge refresh event for immediate sidebar update
                        window.dispatchEvent(new Event('refreshBadges'));
                        alert('Member approved successfully!');
                      } else {
                        const errorData = await response.json();
                        alert(errorData.error || 'Failed to approve member');
                      }
                    } catch (error: any) {
                      alert(error.message || 'Error approving member');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve Member
                </button>
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedMember(null);
                    setApprovalDate('');
                    setDecisionNumber('');
                    setRemarks('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
