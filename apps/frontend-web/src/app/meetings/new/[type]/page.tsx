'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../contexts/AuthContext';

// Redirect old /meetings/new/[type] route to /governance/meetings/new/[type]
export default function NewMeetingByTypePage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && params.type) {
      router.replace(`/governance/meetings/new/${params.type}`);
    }
  }, [authLoading, isAuthenticated, router, params.type]);

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
