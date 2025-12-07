'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { removeDuplication } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Member {
  id: string;
  memberNumber: string | null;
  memberType?: 'INDIVIDUAL' | 'INSTITUTION';
  firstName?: string;
  middleName?: string;
  lastName?: string;
  institutionName?: string;
  fullName?: string;
  fullNameNepali?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  workflowStatus?: string;
  createdAt: string;
}

export default function AllMembersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [token, searchTerm]);

  const fetchMembers = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const url = new URL(`${API_URL}/members`);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      url.searchParams.append('hasMemberNumber', 'true');

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        setError('Failed to load members');
      }
    } catch (err) {
      setError('Error loading members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (member: Member) => {
    if (!token) return;
    if (
      !confirm(
        `Are you sure you want to ${member.isActive ? 'deactivate' : 'activate'} this member?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/members/${member.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      if (response.ok) {
        fetchMembers();
      } else {
        alert('Failed to update member');
      }
    } catch (err) {
      alert('Error updating member');
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
          <span className="text-gray-900">All Members</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Members</h1>
            <p className="mt-1 text-sm text-gray-500">Manage cooperative members</p>
          </div>
          <button
            onClick={() => router.push('/members/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Member
          </button>
        </div>

        {/* Search */}
        <div className="bg-white shadow rounded-lg p-4">
          <input
            type="text"
            placeholder="Search by name, member number, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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
            <p className="mt-4 text-gray-600">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500">No members found</p>
            <button
              onClick={() => router.push('/members/new')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add First Member
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
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
                      {member.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.workflowStatus === 'active'
                            ? 'bg-green-100 text-green-800'
                            : member.workflowStatus === 'application'
                              ? 'bg-gray-100 text-gray-800'
                              : member.workflowStatus === 'under_review'
                                ? 'bg-yellow-100 text-yellow-800'
                                : member.workflowStatus === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : member.workflowStatus === 'bod_pending'
                                    ? 'bg-purple-100 text-purple-800'
                                    : member.workflowStatus === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.workflowStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/members/${member.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`${
                          member.isActive
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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
