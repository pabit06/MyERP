'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { format } from 'date-fns';

interface SavingsAccount {
  id: string;
  accountNumber: string;
  productName: string;
  balance: number;
  interestRate: number;
  status: string;
}

interface FDAccount {
  id: string;
  accountNumber: string;
  productName: string;
  principal: number;
  interestRate: number;
  maturityDate: string;
  status: string;
}

export default function MemberAccountsPage() {
  const router = useRouter();
  const [savings, setSavings] = useState<SavingsAccount[]>([]);
  const [fds, setFds] = useState<FDAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('member_token');
    if (!token) {
      router.push('/member/login');
      return;
    }

    const fetchAccounts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member-portal/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSavings(data.savings);
          setFds(data.fixedDeposits);
        }
      } catch (error) {
        console.error('Failed to fetch accounts', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [router]);

  if (loading) {
    return <div className="p-6">Loading accounts...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Accounts</h1>
        <p className="text-gray-600">View your savings and fixed deposit accounts.</p>
      </div>

      {/* Savings Accounts Section */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Savings Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Account Number</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium text-right">Balance</th>
                <th className="px-6 py-3 font-medium text-right">Rate (%)</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {savings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No savings accounts found.
                  </td>
                </tr>
              ) : (
                savings.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{acc.accountNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{acc.productName}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      NPR {acc.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{acc.interestRate}%</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          acc.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a
                        href={`/member/accounts/${acc.id}/statement`}
                        className="text-teal-600 hover:text-teal-900 font-medium text-xs"
                      >
                        Statement
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href={`/member/accounts/${acc.id}/qr`}
                        className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                      >
                        QR
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FD Accounts Section */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Fixed Deposits</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Account Number</th>
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium text-right">Principal</th>
                <th className="px-6 py-3 font-medium text-right">Rate (%)</th>
                <th className="px-6 py-3 font-medium">Maturity Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No fixed deposit accounts found.
                  </td>
                </tr>
              ) : (
                fds.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{acc.accountNumber}</td>
                    <td className="px-6 py-4 text-gray-600">{acc.productName}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      NPR {acc.principal.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{acc.interestRate}%</td>
                    <td className="px-6 py-4 text-gray-600">
                      {format(new Date(acc.maturityDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          acc.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a
                        href={`/member/accounts/${acc.id}/statement`}
                        className="text-teal-600 hover:text-teal-900 font-medium text-xs"
                      >
                        Statement
                      </a>
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
