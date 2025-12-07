'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { removeDuplication } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Member {
  id: string;
  memberNumber: string | null;
  memberType?: 'INDIVIDUAL' | 'INSTITUTION';
  firstName: string;
  middleName?: string;
  lastName: string;
  institutionName?: string;
  fullName?: string;
  fullNameNepali?: string;
  email?: string;
  phone?: string;
  workflowStatus?: string;
  createdAt: string;
}

export default function KYMApprovalsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchPendingMembers();
  }, [token]);

  const fetchPendingMembers = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter members that need KYM approval
        const pending = (data.members || []).filter((m: Member) =>
          ['application', 'under_review', 'approved'].includes(m.workflowStatus || '')
        );
        setMembers(pending);
      } else {
        setError('Failed to load pending members');
      }
    } catch (err) {
      setError('Error loading pending members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (
    memberId: string,
    action: 'approve' | 'reject' | 'review' | 'complete_review'
  ) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/member-workflow/${memberId}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchPendingMembers();
        // Trigger badge refresh event for immediate sidebar update
        window.dispatchEvent(new Event('refreshBadges'));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update member status');
      }
    } catch (err) {
      alert('Error updating member status');
    }
  };

  const toggleSelectMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((m) => m.id)));
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    const aValue = a[sortBy as keyof Member];
    const bValue = b[sortBy as keyof Member];

    if (sortBy === 'createdAt') {
      return sortOrder === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (!aValue) return 1;
    if (!bValue) return -1;

    const comparison = String(aValue).localeCompare(String(bValue));
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 inline-block ml-1" />
    );
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'application':
        return 'bg-gray-100 text-gray-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500">
          <Link href="/members" className="hover:text-indigo-600">
            Member Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Member Approval</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Member Approval</h1>
            <p className="mt-1 text-sm text-gray-500">Review and approve member applications</p>
          </div>
          {selectedMembers.size > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  selectedMembers.forEach((id) => handleReview(id, 'approve'));
                  setSelectedMembers(new Set());
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve Selected ({selectedMembers.size})
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Members Table */}
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pending members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500">No pending member approvals</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === members.length && members.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('memberNumber')}
                  >
                    Member # <SortIcon field="memberNumber" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('firstName')}
                  >
                    Name <SortIcon field="firstName" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    Application Date <SortIcon field="createdAt" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    Email <SortIcon field="email" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('workflowStatus')}
                  >
                    Status <SortIcon field="workflowStatus" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => toggleSelectMember(member.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.memberNumber || <span className="text-gray-400 italic">Pending</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>
                          {removeDuplication(
                            member.memberType === 'INSTITUTION'
                              ? member.institutionName ||
                                  member.fullName ||
                                  member.firstName ||
                                  'Unknown Member'
                              : member.fullName ||
                                  `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                                  'Unknown Member'
                          )}
                        </div>
                        {member.fullNameNepali && (
                          <div
                            className="text-xs text-gray-500 mt-1"
                            style={{
                              fontFamily: 'Arial Unicode MS, Noto Sans Devanagari, sans-serif',
                            }}
                          >
                            {member.fullNameNepali}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.workflowStatus)}`}
                      >
                        {member.workflowStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/members/${member.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      {member.workflowStatus === 'application' && (
                        <button
                          onClick={() => handleReview(member.id, 'review')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
                        </button>
                      )}
                      {member.workflowStatus === 'under_review' && (
                        <>
                          <button
                            onClick={() => handleReview(member.id, 'approve')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(member.id, 'reject')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
