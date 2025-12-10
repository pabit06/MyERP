'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const MEETING_TYPES = [
  {
    value: 'board',
    label: 'Board Meeting',
    description: 'Board of Directors meeting for decision making',
    icon: '👔',
    color: 'indigo',
  },
  {
    value: 'general',
    label: 'General Meeting',
    description: 'General assembly meeting for all members',
    icon: '👥',
    color: 'blue',
  },
  {
    value: 'committee',
    label: 'Committee Meeting',
    description: 'Committee or sub-committee meeting',
    icon: '📋',
    color: 'green',
  },
  {
    value: 'other',
    label: 'Other Meeting',
    description: 'Other types of meetings',
    icon: '📅',
    color: 'gray',
  },
];

export default function NewMeetingPage() {
  const router = useRouter();
  const { hasModule, isAuthenticated, isLoading: authLoading } = useAuth();

  const handleSelectType = (meetingType: string) => {
    router.push(`/governance/meetings/new/${meetingType}`);
  };

  if (authLoading) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please login to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasModule('governance')) {
    return (
      <ProtectedRoute requiredModule="governance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              Governance module is not enabled for your subscription plan.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredModule="governance">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/governance/meetings"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Meetings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Meeting</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose the type of meeting you want to create
          </p>
        </div>

        {/* Meeting Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MEETING_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleSelectType(type.value)}
              className={`bg-white border-2 rounded-lg p-6 text-left hover:shadow-lg transition-all ${
                type.color === 'indigo'
                  ? 'border-indigo-300 hover:border-indigo-500'
                  : type.color === 'blue'
                    ? 'border-blue-300 hover:border-blue-500'
                    : type.color === 'green'
                      ? 'border-green-300 hover:border-green-500'
                      : 'border-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{type.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{type.label}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
                <div className="text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
