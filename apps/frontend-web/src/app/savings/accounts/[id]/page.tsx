'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SavingAccount {
  id: string;
  accountNumber: string;
  memberId: string;
  productId: string;
  balance: number;
  interestAccrued: number;
  status: string;
  openedDate: string;
  closedDate?: string;
  lastInterestCalculatedDate?: string;
  lastInterestPostedDate?: string;
  nominee?: any;
  member?: {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  product?: {
    id: string;
    code: string;
    name: string;
    interestRate: number;
    minimumBalance: number;
  };
}

export default function SavingsAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [account, setAccount] = useState<SavingAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'operations'>('overview');

  useEffect(() => {
    if (token && params.id) {
      fetchAccount();
    }
  }, [token, params.id]);

  const fetchAccount = async () => {
    if (!token || !params.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/savings/accounts/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Account not found');
      }
    } catch (err) {
      setError('Error loading account');
      toast.error('Could not fetch account details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading account details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !account) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <Link
            href="/savings"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block"
          >
            ← Back to Savings
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Account not found'}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Toaster position="top-right" />
      <div className="p-6 space-y-6">
        <div>
          <Link
            href="/savings"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
          >
            ← Back to Savings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Savings Account Details</h1>
          <p className="text-lg text-gray-600 mt-1">Account Number: {account.accountNumber}</p>
        </div>

        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Balance</h3>
            <p className="text-3xl font-bold text-gray-900">
              NPR {Number(account.balance).toLocaleString('en-NP', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Accrued Interest</h3>
            <p className="text-3xl font-bold text-indigo-600">
              NPR {Number(account.interestAccrued || 0).toLocaleString('en-NP', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                account.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : account.status === 'closed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {account.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'operations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Operations
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.accountNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Product</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.product?.name || '-'} ({account.product?.code || '-'})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Member</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.member ? (
                      <Link
                        href={`/members/${account.memberId}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {account.member.firstName} {account.member.lastName} ({account.member.memberNumber})
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Interest Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.product?.interestRate || 0}% per annum
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Minimum Balance</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    NPR {Number(account.product?.minimumBalance || 0).toLocaleString('en-NP', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Opened Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(account.openedDate).toLocaleDateString()}
                  </dd>
                </div>
                {account.lastInterestCalculatedDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Interest Calculated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(account.lastInterestCalculatedDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {account.lastInterestPostedDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Interest Posted</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(account.lastInterestPostedDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {account.nominee && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Nominee Information</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{account.nominee.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Relation</dt>
                    <dd className="mt-1 text-sm text-gray-900">{account.nominee.relation || '-'}</dd>
                  </div>
                  {account.nominee.citizenship && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Citizenship Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{account.nominee.citizenship}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
            <p className="text-gray-500">Transaction history will be displayed here.</p>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/savings/accounts/${account.id}/deposit`)}
                className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center"
              >
                Deposit
              </button>
              <button
                onClick={() => router.push(`/savings/accounts/${account.id}/withdraw`)}
                className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-center"
              >
                Withdraw
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

