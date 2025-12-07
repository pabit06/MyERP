'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { apiClient } from '@/lib/api';
import { KymForm } from '@/features/members';
import { KymFormData } from '@myerp/shared-types';

export default function MemberKycPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [defaultValues, setDefaultValues] = useState<Partial<KymFormData> | null>(null);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!memberId) return;
      try {
        // Fetch member basic data
        const memberData = await apiClient.get<{
          member: { firstName?: string; lastName?: string };
        }>(`/members/${memberId}`);

        // Try to fetch existing KYM data if available
        try {
          const kymData = await apiClient.get<KymFormData>(`/members/${memberId}/kym`);
          setDefaultValues(kymData);
        } catch {
          // No KYM data yet, use member basic data as defaults
          setDefaultValues({
            firstName: memberData.member.firstName || '',
            surname: memberData.member.lastName || '',
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

  const handleKymSubmit = async (data: KymFormData) => {
    if (!memberId) return;
    setError('');

    try {
      await apiClient.put(`/members/${memberId}/kym`, data);
      router.push(`/members/${memberId}`);
    } catch (err: any) {
      // The apiClient already handles error toasts, but we want to show detailed validation errors
      const errorMessage = err.details
        ? `${err.message}\n\n${JSON.stringify(err.details, null, 2)}`
        : err.message || 'Error submitting KYM';
      setError(errorMessage);
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          Member profile created. Please fill in the complete KYM (Know Your Member) information.
        </p>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error submitting KYM form</h3>
                <div className="mt-2 text-sm text-red-700 whitespace-pre-line">{error}</div>
                <p className="mt-2 text-xs text-red-600">
                  Please check the form fields and try again. If the problem persists, check the
                  browser console for more details.
                </p>
              </div>
            </div>
          </div>
        )}
        <KymForm
          mode="onboarding"
          onSubmit={handleKymSubmit}
          onCancel={() => router.push('/members')}
          defaultValues={defaultValues || {}}
        />
      </div>
    </ProtectedRoute>
  );
}
