'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface Member {
  firstName: string;
  lastName: string;
  // Add other fields as needed
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    const token = Cookies.get('member_token');
    if (!token) {
      router.push('/member/login');
      return;
    }

    const storedMember = localStorage.getItem('member_user');
    if (storedMember) {
      setMember(JSON.parse(storedMember));
    }
  }, [router]);

  if (!member) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {member.firstName} {member.lastName}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Savings Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Savings</h3>
          <p className="mt-2 text-3xl font-bold text-teal-600">NPR 0.00</p>
          <p className="mt-1 text-xs text-gray-400">Across 0 accounts</p>
        </div>

        {/* Loan Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Loan Balance</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">NPR 0.00</p>
          <p className="mt-1 text-xs text-gray-400">0 Active Loans</p>
        </div>

        {/* Share Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Share Balance</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">NPR 0.00</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Real-time balance fetching will be implemented in the next update.
        </p>
      </div>
    </div>
  );
}
