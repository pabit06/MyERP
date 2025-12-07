'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';

// Redirect old /meetings/[id] route to /governance/meetings/[id]
export default function MeetingDetailPageRedirect() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && params.id) {
      router.replace(`/governance/meetings/${params.id}`);
    }
  }, [authLoading, isAuthenticated, router, params.id]);

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
