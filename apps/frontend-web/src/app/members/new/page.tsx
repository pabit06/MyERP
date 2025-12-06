'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, Button } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function NewMemberPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [memberType, setMemberType] = useState<'INDIVIDUAL' | 'INSTITUTION'>('INDIVIDUAL');
  const [initialData, setInitialData] = useState({
    firstName: '',
    lastName: '',
    institutionName: '',
  });

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');

    try {
      const memberResponse = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberType,
          // For individuals: send firstName and lastName
          // For institutions: send institutionName only
          ...(memberType === 'INSTITUTION'
            ? { institutionName: initialData.institutionName }
            : { firstName: initialData.firstName, lastName: initialData.lastName }),
        }),
      });

      if (!memberResponse.ok) {
        const errorData = await memberResponse.json();
        const errorMessage = errorData.details
          ? `${errorData.error || 'Validation failed'}: ${JSON.stringify(errorData.details, null, 2)}`
          : errorData.error || 'Failed to create member';
        throw new Error(errorMessage);
      }

      const memberResult = await memberResponse.json();
      const createdMemberId = memberResult.member.id;

      // Redirect to appropriate KYC page based on member type
      if (memberType === 'INSTITUTION') {
        router.push(`/members/${createdMemberId}/institution-kyc`);
      } else {
        router.push(`/members/${createdMemberId}/kyc`);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating member');
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto mt-10">
        <h1 className="text-2xl font-bold mb-4">Create New Member</h1>
        <p className="mb-4 text-gray-600">Select member type and enter basic information.</p>
        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Type *</label>
            <select
              value={memberType}
              onChange={(e) => setMemberType(e.target.value as 'INDIVIDUAL' | 'INSTITUTION')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="INDIVIDUAL">Individual (Natural Person)</option>
              <option value="INSTITUTION">Institution (Legal Entity)</option>
            </select>
          </div>
          {memberType === 'INDIVIDUAL' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={initialData.firstName}
                  onChange={(e) =>
                    setInitialData({ ...initialData, firstName: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={initialData.lastName}
                  onChange={(e) =>
                    setInitialData({ ...initialData, lastName: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institution Name *
              </label>
              <input
                type="text"
                value={initialData.institutionName}
                onChange={(e) =>
                  setInitialData({ ...initialData, institutionName: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter institution name"
                required
              />
            </div>
          )}
          <Button type="submit">Continue to KYM Form</Button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </form>
      </div>
    </ProtectedRoute>
  );
}
