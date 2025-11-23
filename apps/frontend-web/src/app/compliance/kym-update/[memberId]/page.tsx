'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../contexts/AuthContext';
import { KymForm } from '../../../../components/KymForm';
import { KymFormData } from '@myerp/shared-types';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function KymUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [defaultValues, setDefaultValues] = useState<Partial<KymFormData> | null>(null);

  useEffect(() => {
    const fetchKymData = async () => {
      if (!token || !memberId) return;
      try {
        const response = await fetch(`${API_URL}/members/${memberId}/kym`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch KYM data');
        const data = await response.json();
        setDefaultValues(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchKymData();
  }, [memberId, token]);

  const handleKymSubmit = async (data: KymFormData) => {
    if (!token || !memberId) return;
    setError('');

    try {
      const response = await fetch(`${API_URL}/members/${memberId}/kym`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update KYM');
      }

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
