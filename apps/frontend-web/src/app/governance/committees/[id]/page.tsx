'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
import Link from 'next/link';

interface CommitteeMember {
  id: string;
  memberId: string;
  position: string;
  positionNepali?: string;
  photoPath?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  isActing: boolean;
  member: {
    id: string;
    memberNumber?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    institutionName?: string;
    memberType: string;
  };
  tenure?: {
    id: string;
    name: string;
    startDate: string;
    endDate?: string;
  };
}

interface CommitteeTenure {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  isCurrent: boolean;
}

interface Committee {
  id: string;
  name: string;
  nameNepali?: string;
  description?: string;
  type: string;
  isStatutory: boolean;
  members: CommitteeMember[];
  tenures: CommitteeTenure[];
}

interface Member {
  id: string;
  memberNumber?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  institutionName?: string;
  memberType: string;
  fullName?: string;
}

const COMMITTEE_TYPES = [
  { value: 'BOD', label: 'Board of Directors (सञ्चालक समिति)' },
  { value: 'ACCOUNT', label: 'Account Committee (लेखा समिति)' },
  { value: 'LOAN', label: 'Loan Committee (ऋण उप-समिति)' },
  { value: 'EDUCATION', label: 'Education Committee (शिक्षा उप-समिति)' },
  { value: 'OTHER', label: 'Other Committee (अन्य समिति)' },
];

export default function CommitteeDetailPage() {
  const params = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'tenure' | 'settings'>('members');
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Member management state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [memberFormData, setMemberFormData] = useState({
    memberId: '',
    tenureId: '',
    position: '',
    positionNepali: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActing: false,
  });

  // Member search/filter state
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberPositionFilter, setMemberPositionFilter] = useState<string>('');

  // Tenure management state
  const [showAddTenureModal, setShowAddTenureModal] = useState(false);
  const [tenureFormData, setTenureFormData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    isCurrent: false,
  });

  // Settings state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({
    name: '',
    nameNepali: '',
    description: '',
    type: 'OTHER',
    isStatutory: false,
  });

  const committeeId = params.id as string;

  useEffect(() => {
    if (!authLoading && isAuthenticated && committeeId) {
      fetchCommittee();
    }
  }, [authLoading, isAuthenticated, committeeId]);

  const fetchCommittee = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ committee: Committee }>(
        `/governance/committees/${committeeId}`
      );
      setCommittee(data.committee);
      setSettingsFormData({
        name: data.committee.name,
        nameNepali: data.committee.nameNepali || '',
        description: data.committee.description || '',
        type: data.committee.type,
        isStatutory: data.committee.isStatutory,
      });
      setError(null);
    } catch (err: any) {
      console.error('Error fetching committee:', err);
      setError(err.message || 'Failed to load committee');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const data = await apiClient.get<{ members: any[] }>('/members?isActive=true&limit=100');
      setAvailableMembers(data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handleAddMember = async () => {
    if (!memberFormData.memberId || !memberFormData.position || !memberFormData.startDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.post(`/governance/committees/${committeeId}/members`, {
        ...memberFormData,
        tenureId: memberFormData.tenureId || null,
        endDate: memberFormData.endDate || null,
      });
      await fetchCommittee();
      setShowAddMemberModal(false);
      setMemberFormData({
        memberId: '',
        tenureId: '',
        position: '',
        positionNepali: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isActing: false,
      });
    } catch (err: any) {
      alert(err.message || 'Error adding member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the committee?')) {
      return;
    }

    try {
      await apiClient.delete(`/governance/committees/${committeeId}/members/${memberId}`);
      await fetchCommittee();
    } catch (err: any) {
      alert(err.message || 'Error removing member');
    }
  };

  const handleAddTenure = async () => {
    if (!tenureFormData.name || !tenureFormData.startDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.post(`/governance/committees/${committeeId}/tenure`, {
        ...tenureFormData,
        endDate: tenureFormData.endDate || null,
      });
      await fetchCommittee();
      setShowAddTenureModal(false);
      setTenureFormData({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
        isCurrent: false,
      });
    } catch (err: any) {
      alert(err.message || 'Error adding tenure');
    }
  };

  const handleDeleteTenure = async (tenureId: string) => {
    if (!confirm('Are you sure you want to delete this tenure period?')) {
      return;
    }

    try {
      await apiClient.delete(`/governance/committees/${committeeId}/tenure/${tenureId}`);
      await fetchCommittee();
    } catch (err: any) {
      alert(err.message || 'Error deleting tenure');
    }
  };

  const handleUpdateSettings = async () => {
    if (!settingsFormData.name.trim()) {
      alert('Committee name is required');
      return;
    }

    try {
      await apiClient.put(`/governance/committees/${committeeId}`, settingsFormData);
      await fetchCommittee();
      setIsEditingSettings(false);
    } catch (err: any) {
      alert(err.message || 'Error updating committee');
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading committee...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !committee) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="p-6">
          <Link
            href="/governance/committees"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block"
          >
            ← Back to Committees
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'Committee not found'}</p>
            <Button onClick={fetchCommittee} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Filter and search members
  const currentMembers = committee.members
    .filter((m) => m.isActive)
    .filter((m) => {
      // Search filter
      if (memberSearchTerm) {
        const searchLower = memberSearchTerm.toLowerCase();
        const memberName =
          m.member.memberType === 'INSTITUTION'
            ? m.member.institutionName || ''
            : `${m.member.firstName || ''} ${m.member.middleName || ''} ${m.member.lastName || ''}`.trim();
        const memberNumber = m.member.memberNumber || '';
        const position = m.position || '';
        const positionNepali = m.positionNepali || '';

        if (
          !memberName.toLowerCase().includes(searchLower) &&
          !memberNumber.toLowerCase().includes(searchLower) &&
          !position.toLowerCase().includes(searchLower) &&
          !positionNepali.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Position filter
      if (memberPositionFilter) {
        if (m.position !== memberPositionFilter && m.positionNepali !== memberPositionFilter) {
          return false;
        }
      }

      return true;
    });

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="p-6 space-y-6">
        <div>
          <Link
            href="/governance/committees"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Committees
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{committee.name}</h1>
          {committee.nameNepali && (
            <p className="text-lg text-gray-600 mt-1">{committee.nameNepali}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Current Members
            </button>
            <button
              onClick={() => setActiveTab('tenure')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tenure'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tenure/History
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Current Members</CardTitle>
                <Button
                  onClick={() => {
                    fetchAvailableMembers();
                    setShowAddMemberModal(true);
                  }}
                >
                  + Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Search by name, member number, or position..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="w-48">
                    <select
                      value={memberPositionFilter}
                      onChange={(e) => setMemberPositionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Positions</option>
                      {Array.from(
                        new Set(
                          committee.members
                            .filter((m) => m.isActive)
                            .map((m) => m.position || m.positionNepali)
                            .filter(Boolean)
                        )
                      ).map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {(memberSearchTerm || memberPositionFilter) && (
                  <div className="text-sm text-gray-600">
                    Showing {currentMembers.length} of{' '}
                    {committee.members.filter((m) => m.isActive).length} members
                  </div>
                )}
              </div>
              {currentMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No active members in this committee.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentMembers.map((member) => {
                    const memberName =
                      member.member.memberType === 'INSTITUTION'
                        ? member.member.institutionName || 'Institution Member'
                        : `${member.member.firstName || ''} ${member.member.middleName || ''} ${member.member.lastName || ''}`.trim() ||
                          'Member';

                    return (
                      <div key={member.id} className="border rounded-lg p-4 relative">
                        <button
                          onClick={() => handleRemoveMember(member.memberId)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm"
                          title="Remove member"
                        >
                          ×
                        </button>
                        {member.photoPath ? (
                          <img
                            src={member.photoPath}
                            alt={memberName}
                            className="w-24 h-24 rounded-full mx-auto mb-3 object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full mx-auto mb-3 bg-gray-200 flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                          </div>
                        )}
                        <h3 className="font-semibold text-center">{memberName}</h3>
                        <p className="text-sm text-gray-600 text-center mt-1">
                          {member.positionNepali || member.position}
                        </p>
                        {member.isActing && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded block text-center mt-2">
                            Acting (कार्यवाहक)
                          </span>
                        )}
                        {member.member.memberNumber && (
                          <p className="text-xs text-gray-500 text-center mt-1">
                            Member #: {member.member.memberNumber}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'tenure' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tenure/History</CardTitle>
                <Button onClick={() => setShowAddTenureModal(true)}>+ Add Tenure</Button>
              </div>
            </CardHeader>
            <CardContent>
              {committee.tenures.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tenure periods recorded.</p>
              ) : (
                <div className="space-y-4">
                  {committee.tenures.map((tenure) => (
                    <div key={tenure.id} className="border rounded-lg p-4 relative">
                      <button
                        onClick={() => handleDeleteTenure(tenure.id)}
                        className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm"
                        title="Delete tenure"
                      >
                        ×
                      </button>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{tenure.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(tenure.startDate).toLocaleDateString()} -{' '}
                            {tenure.endDate
                              ? new Date(tenure.endDate).toLocaleDateString()
                              : 'Ongoing'}
                          </p>
                          {tenure.notes && (
                            <p className="text-sm text-gray-500 mt-2">{tenure.notes}</p>
                          )}
                        </div>
                        {tenure.isCurrent && (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Committee Settings</CardTitle>
                {!isEditingSettings && (
                  <Button onClick={() => setIsEditingSettings(true)} variant="outline">
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name (English) *</label>
                <Input
                  value={settingsFormData.name}
                  onChange={(e) =>
                    setSettingsFormData({ ...settingsFormData, name: e.target.value })
                  }
                  disabled={!isEditingSettings}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name (Nepali)</label>
                <Input
                  value={settingsFormData.nameNepali}
                  onChange={(e) =>
                    setSettingsFormData({ ...settingsFormData, nameNepali: e.target.value })
                  }
                  disabled={!isEditingSettings}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded-md p-2"
                  value={settingsFormData.description}
                  onChange={(e) =>
                    setSettingsFormData({ ...settingsFormData, description: e.target.value })
                  }
                  disabled={!isEditingSettings}
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={settingsFormData.type}
                  onChange={(e) =>
                    setSettingsFormData({ ...settingsFormData, type: e.target.value })
                  }
                  className="w-full border rounded-md p-2"
                  disabled={!isEditingSettings}
                >
                  {COMMITTEE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settingsFormData.isStatutory}
                  onChange={(e) =>
                    setSettingsFormData({ ...settingsFormData, isStatutory: e.target.checked })
                  }
                  disabled={!isEditingSettings}
                  className="rounded"
                />
                <label className="text-sm font-medium">Statutory Committee</label>
              </div>
              {isEditingSettings && (
                <div className="flex space-x-3">
                  <Button onClick={handleUpdateSettings}>Save Changes</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingSettings(false);
                      setSettingsFormData({
                        name: committee.name,
                        nameNepali: committee.nameNepali || '',
                        description: committee.description || '',
                        type: committee.type,
                        isStatutory: committee.isStatutory,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Add Committee Member</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Member *</label>
                  <select
                    value={memberFormData.memberId}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, memberId: e.target.value })
                    }
                    className="w-full border rounded-md p-2"
                    required
                  >
                    <option value="">Select a member</option>
                    {availableMembers.map((member) => {
                      const memberName =
                        member.memberType === 'INSTITUTION'
                          ? member.institutionName || 'Institution Member'
                          : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                            'Member';
                      return (
                        <option key={member.id} value={member.id}>
                          {memberName} {member.memberNumber ? `(#${member.memberNumber})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Position *</label>
                  <Input
                    value={memberFormData.position}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, position: e.target.value })
                    }
                    placeholder="e.g., Chairman"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Position (Nepali)</label>
                  <Input
                    value={memberFormData.positionNepali}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, positionNepali: e.target.value })
                    }
                    placeholder="e.g., अध्यक्ष"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tenure (Optional)</label>
                  <select
                    value={memberFormData.tenureId}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, tenureId: e.target.value })
                    }
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">None</option>
                    {committee.tenures.map((tenure) => (
                      <option key={tenure.id} value={tenure.id}>
                        {tenure.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <Input
                    type="date"
                    value={memberFormData.startDate}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                  <Input
                    type="date"
                    value={memberFormData.endDate}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={memberFormData.isActing}
                    onChange={(e) =>
                      setMemberFormData({ ...memberFormData, isActing: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label className="text-sm font-medium">Acting (कार्यवाहक)</label>
                </div>
                <div className="flex space-x-3">
                  <Button onClick={handleAddMember} className="flex-1">
                    Add Member
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setMemberFormData({
                        memberId: '',
                        tenureId: '',
                        position: '',
                        positionNepali: '',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: '',
                        isActing: false,
                      });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Tenure Modal */}
        {showAddTenureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Add Tenure Period</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={tenureFormData.name}
                    onChange={(e) => setTenureFormData({ ...tenureFormData, name: e.target.value })}
                    placeholder="e.g., Term 2080-2084"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <Input
                    type="date"
                    value={tenureFormData.startDate}
                    onChange={(e) =>
                      setTenureFormData({ ...tenureFormData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                  <Input
                    type="date"
                    value={tenureFormData.endDate}
                    onChange={(e) =>
                      setTenureFormData({ ...tenureFormData, endDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full border rounded-md p-2"
                    value={tenureFormData.notes}
                    onChange={(e) =>
                      setTenureFormData({ ...tenureFormData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={tenureFormData.isCurrent}
                    onChange={(e) =>
                      setTenureFormData({ ...tenureFormData, isCurrent: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label className="text-sm font-medium">Mark as Current Tenure</label>
                </div>
                <div className="flex space-x-3">
                  <Button onClick={handleAddTenure} className="flex-1">
                    Add Tenure
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddTenureModal(false);
                      setTenureFormData({
                        name: '',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: '',
                        notes: '',
                        isCurrent: false,
                      });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
