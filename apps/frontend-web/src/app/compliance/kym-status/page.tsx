'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/features/components/shared';
import Link from 'next/link';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string;
  pepStatus: boolean;
  riskCategory: string;
  lastKymUpdate?: string;
  nextKymReviewDate?: string;
  kym?: {
    occupation?: string;
  };
}

export default function KymStatus() {
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ expired: 'true', pepOnly: 'false' });

  useEffect(() => {
    if (!token) return;

    fetchMembers();
  }, [token, filter]);

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.expired) params.append('expired', filter.expired);
      if (filter.pepOnly === 'true') params.append('pepOnly', 'true');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/compliance/aml/kym-status?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching KYM status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredModule="compliance">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">KYM Status</h1>

        <div className="mb-4 flex gap-4">
          <select
            value={filter.expired}
            onChange={(e) => setFilter({ ...filter, expired: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="true">Expired</option>
            <option value="false">Expiring Soon (30 days)</option>
            <option value="">All</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filter.pepOnly === 'true'}
              onChange={(e) =>
                setFilter({ ...filter, pepOnly: e.target.checked ? 'true' : 'false' })
              }
            />
            PEP Only
          </label>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    PEP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Risk Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last KYM Update
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Next Review Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.firstName} {member.lastName} ({member.memberNumber})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.pepStatus ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.riskCategory === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : member.riskCategory === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {member.riskCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.lastKymUpdate
                        ? new Date(member.lastKymUpdate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.nextKymReviewDate
                        ? new Date(member.nextKymReviewDate).toLocaleDateString()
                        : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/compliance/kym-update/${member.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Update KYM
                      </Link>
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
