'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface LoanAccount {
  id: string;
  loanNumber: string;
  productName: string;
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  status: string;
}

export default function MemberLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('member_token');
    if (!token) {
      router.push('/member/login');
      return;
    }

    const fetchLoans = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member-portal/loans`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setLoans(data.loans || []);
        }
      } catch (error) {
        console.error('Failed to fetch loans', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [router]);

  if (loading) {
    return <div className="p-6">Loading loans...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Loans</h1>
        <p className="text-gray-600">View your active loan accounts.</p>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Active Loans</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Loan Number</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium text-right">Principal</th>
                <th className="px-6 py-3 font-medium text-right">Outstanding</th>
                <th className="px-6 py-3 font-medium text-right">Rate (%)</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No active loans found.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{loan.loanNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{loan.productName}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      NPR {loan.principalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-600">
                      NPR {loan.outstandingBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{loan.interestRate}%</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800`}
                      >
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
