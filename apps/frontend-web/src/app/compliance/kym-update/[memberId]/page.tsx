'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { apiClient } from '@/lib/api';
import { KymForm } from '@/features/members';
import { KymFormData } from '@myerp/shared-types';

export default function KymUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [defaultValues, setDefaultValues] = useState<Partial<KymFormData> | null>(null);

  useEffect(() => {
    const fetchKymData = async () => {
      if (!memberId) return;
      try {
        const data = await apiClient.get<KymFormData>(`/members/${memberId}/kym`);
        setDefaultValues(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchKymData();
  }, [memberId]);

  const handleKymSubmit = async (data: KymFormData) => {
    if (!memberId) return;
    setError('');

    try {
      await apiClient.put(`/members/${memberId}/kym`, data);
      router.push(`/members/${memberId}`);
    } catch (err: any) {
      setError(err.message || 'Error updating KYM');
    }
  };

  if (loading) return <p>Loading KYM form...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Update KYM Information</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and update the Know Your Member information.
        </p>
        <KymForm
          mode="update"
          onSubmit={handleKymSubmit}
          onCancel={() => router.back()}
          defaultValues={defaultValues || {}}
        />
      </div>
    </ProtectedRoute>
  );
}
