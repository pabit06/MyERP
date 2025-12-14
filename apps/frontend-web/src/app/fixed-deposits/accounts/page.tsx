'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function FDAccountsPage() {
  const { token } = useAuth();
  interface FDAccount {
    id: string;
    accountNumber: string;
    principal: number;
    interestRate: number;
    maturityDate: string;
    status: string;
    member?: {
      name?: string;
      memberNumber?: string;
    };
  }
  const [accounts, setAccounts] = useState<FDAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Backend endpoint for listing accounts is now available
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/fixed-deposits/accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);
        }
      } catch (error) {
        console.error('Failed to fetch accounts', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, [token, API_URL]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fixed Deposit Accounts
          </h1>
          <p className="text-slate-500">View and manage member fixed deposit accounts.</p>
        </div>
        <Link
          href="/fixed-deposits/accounts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Open New Account
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by account number or member..."
            className="w-full rounded-lg border border-slate-200 pl-9 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Account No</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Member</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Principal</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Rate</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Maturity Date</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No FD accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link
                        href={`/fixed-deposits/accounts/${acc.id}`}
                        className="hover:underline text-primary"
                      >
                        {acc.accountNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {acc.member?.name}
                      <div className="text-xs text-slate-400">{acc.member?.memberNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      NPR {Number(acc.principal).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{acc.interestRate}%</td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(acc.maturityDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          acc.status === 'ACTIVE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/fixed-deposits/accounts/${acc.id}`}
                        className="font-medium text-primary hover:text-primary/80"
                      >
                        View
                      </Link>
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
