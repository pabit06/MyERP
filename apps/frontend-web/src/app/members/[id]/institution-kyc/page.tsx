'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../contexts/AuthContext';
import { KYMInstitutionForm } from '../../../../components/KYMInstitutionForm';
import { InstitutionKymFormData } from '@myerp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function InstitutionKycPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [defaultValues, setDefaultValues] = useState<Partial<InstitutionKymFormData> | null>(null);
  const [member, setMember] = useState<{ institutionName?: string } | null>(null);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!token || !memberId) return;
      try {
        // Fetch member basic data
        const memberResponse = await fetch(`${API_URL}/members/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!memberResponse.ok) throw new Error('Failed to fetch member data');
        const memberData = await memberResponse.json();
        setMember(memberData.member);

        // Try to fetch existing KYM data if available
        try {
          const kymResponse = await fetch(`${API_URL}/members/${memberId}/institution-kym`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (kymResponse.ok) {
            const kymData = await kymResponse.json();
            setDefaultValues(kymData);
          } else {
            // No KYM data yet, use member basic data as defaults
            setDefaultValues({
              name: memberData.member.institutionName || '',
            });
          }
        } catch {
          // No KYM data yet, use member basic data as defaults
          setDefaultValues({
            name: memberData.member.institutionName || '',
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMemberData();
  }, [memberId, token]);

  const handleKymSubmit = async (data: InstitutionKymFormData) => {
    if (!token || !memberId) return;
    setError('');

    try {
      const response = await fetch(`${API_URL}/members/${memberId}/institution-kym`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit KYM');
      }

      router.push(`/members/${memberId}`);
    } catch (err: any) {
      setError(err.message || 'Error submitting KYM');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading KYM form...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !defaultValues) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <p className="text-red-500">Error: {error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Complete KYM Information</h1>
        <p className="mt-1 text-sm text-gray-500">
          Member profile created. Please fill in the complete KYM (Know Your Member) information for
          the institution.
        </p>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        <KYMInstitutionForm
          mode="onboarding"
          onSubmit={handleKymSubmit}
          onCancel={() => router.push('/members')}
          defaultValues={defaultValues || {}}
        />
      </div>
    </ProtectedRoute>
  );
}
