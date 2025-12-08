'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Download } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface FDAccount {
  id: string;
  accountNumber: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  status: 'ACTIVE' | 'CLOSED_MATURITY' | 'CLOSED_PREMATURE';
  accruedInterest: number;
  paidInterest: number;
  member: {
    name: string;
    memberNumber: string;
  };
  product: {
    name: string;
    isPrematureAllowed: boolean;
    penaltyType: string;
    penaltyValue: number;
    durationMonths: number;
  };
}

export default function FDAccountDetailsPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<FDAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const fetchAccount = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/fixed-deposits/accounts/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAccount(data);
        }
      } catch (error) {
        console.error('Failed to fetch account', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccount();
  }, [token, params.id, API_URL]);

  const handleCloseAccount = async () => {
    if (!confirm('Are you sure you want to close this account? This action cannot be undone.'))
      return;

    setIsClosing(true);
    try {
      const res = await fetch(`${API_URL}/fixed-deposits/accounts/${params.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // For MVP simplicity, assuming Cash Payout to a default Cash GL
          // In real app, user selects payout mode
          cashAccountCode: '00-10100-01-00001', // Default Cash
          remarks: 'Closed via Web UI',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to close account');
        setIsClosing(false);
        return;
      }

      alert('Account closed successfully!');
      router.refresh();
      // Refetch or redirect
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('An error occurred');
      setIsClosing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
  if (!account) return <div className="p-8 text-center text-red-500">Account not found</div>;

  const isMatured = new Date() >= new Date(account.maturityDate);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/fixed-deposits/accounts" className="text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {account.product.name} - {account.accountNumber}
          </h1>
          <p className="text-slate-500">
            {account.member.name} ({account.member.memberNumber})
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {account.status === 'ACTIVE' && (
            <button
              onClick={handleCloseAccount}
              disabled={isClosing}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 ${
                isMatured ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isClosing ? 'Processing...' : isMatured ? 'Maturity Close' : 'Premature Close'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Key Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Principal Amount</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            NPR {Number(account.principal).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Interest Rate</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{account.interestRate}%</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Status</div>
          <div className="mt-2 flex items-center gap-2">
            {account.status === 'ACTIVE' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                <Clock className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {account.status.replace('_', ' ')}
              </span>
            )}
            {isMatured && account.status === 'ACTIVE' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Matured
              </span>
            )}
          </div>
        </div>

        {/* Details Card */}
        <div className="col-span-1 md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Details</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-500">Start Date</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {format(new Date(account.startDate), 'PPP')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Maturity Date</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {format(new Date(account.maturityDate), 'PPP')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Accrued Interest (Est.)</dt>
              <dd className="mt-1 text-sm text-slate-900">
                NPR {Number(account.accruedInterest).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Paid Interest</dt>
              <dd className="mt-1 text-sm text-slate-900">
                NPR {Number(account.paidInterest).toLocaleString()}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Product Terms</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {account.product.durationMonths} Months duration.
                {account.product.isPrematureAllowed
                  ? ' Premature allowed'
                  : ' No premature withdrawal'}
                .
                {account.product.penaltyValue
                  ? ` Penalty: ${account.product.penaltyValue}% (${account.product.penaltyType})`
                  : ''}
              </dd>
            </div>
          </dl>
        </div>

        {/* Actions / Interest */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Download Certificate
            </button>
            <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Interest Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
