'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { apiClient } from '@/lib/api';
import { KYMInstitutionForm } from '@/features/members';
import { InstitutionKymFormData } from '@myerp/shared-types';

export default function InstitutionKycPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [defaultValues, setDefaultValues] = useState<Partial<InstitutionKymFormData> | null>(null);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!memberId) return;
      try {
        // Fetch member basic data
        const memberData = await apiClient.get<{ member: { institutionName?: string } }>(
          `/members/${memberId}`
        );

        // Try to fetch existing KYM data if available
        try {
          const kymData = await apiClient.get<InstitutionKymFormData>(
            `/members/${memberId}/institution-kym`
          );
          setDefaultValues(kymData);
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
  }, [memberId]);

  const handleKymSubmit = async (data: InstitutionKymFormData) => {
    if (!memberId) return;
    setError('');

    try {
      await apiClient.put(`/members/${memberId}/institution-kym`, data);
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
