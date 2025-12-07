'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  fullName?: string;
}

interface ShareTransaction {
  id: string;
  transactionNo: string;
  type: string;
  date: string;
  kitta: number;
  amount: number;
  paymentMode: string;
  remarks?: string;
}

interface Statement {
  account: {
    id: string;
    totalKitta: number;
    totalAmount: number;
    unitPrice: number;
    certificateNo?: string;
    member: Member;
    transactions: ShareTransaction[];
  };
}

export default function StatementPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [token]);

  useEffect(() => {
    if (selectedMemberId) {
      fetchStatement(selectedMemberId);
    } else {
      setStatement(null);
      setError('');
    }
  }, [selectedMemberId, token]);

  const fetchMembers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchStatement = async (memberId: string) => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/shares/statements/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        // API returns { statement: { account } }, so we need to adjust
        if (data.statement) {
          console.log('Setting statement from data.statement:', data.statement);
          setStatement(data.statement);
        } else if (data.account) {
          // Fallback for direct account structure
          console.log('Setting statement from data.account:', data.account);
          setStatement({ account: data.account });
        } else {
          console.log('Setting statement directly from data:', data);
          setStatement(data);
        }
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError('Failed to load statement');
      }
    } catch (err) {
      setError('Error loading statement');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ProtectedRoute requiredModule="cbs">
      <div className="p-6">
        <Link
          href="/shares"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shares
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Statement</h1>
          <p className="text-gray-600">View share transaction history for a member</p>
        </div>

        <div className="max-w-4xl">
          {/* Member Selector */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a member...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.memberNumber} - {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading statement...</p>
            </div>
          )}

          {statement && !isLoading && statement.account && statement.account.member && (
            <div className="bg-white rounded-lg shadow border border-gray-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Share Statement</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {statement.account.member.memberNumber} - {statement.account.member.firstName}{' '}
                    {statement.account.member.lastName}
                  </p>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>

              {/* Account Summary */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Kitta</p>
                    <p className="text-lg font-semibold">{statement.account.totalKitta}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Price</p>
                    <p className="text-lg font-semibold">रु. {statement.account.unitPrice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-lg font-semibold">
                      रु.{' '}
                      {statement.account.totalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                {statement.account.certificateNo && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Certificate No.</p>
                    <p className="text-lg font-semibold">{statement.account.certificateNo}</p>
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kitta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statement.account.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      <>
                        {statement.account.transactions.map((tx, index) => {
                          // Calculate running balance
                          const runningBalance = statement.account.transactions
                            .slice(0, index + 1)
                            .reduce((sum, t) => sum + t.kitta, 0);

                          return (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(tx.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {tx.transactionNo}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    tx.type === 'PURCHASE'
                                      ? 'bg-green-100 text-green-800'
                                      : tx.type === 'RETURN'
                                        ? 'bg-red-100 text-red-800'
                                        : tx.type === 'BONUS'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {tx.kitta > 0 ? '+' : ''}
                                {tx.kitta}
                                <span className="text-xs text-gray-500 ml-2">
                                  ({runningBalance})
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                रु.{' '}
                                {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {tx.paymentMode}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {tx.remarks || '-'}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Total Row */}
                        <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                          <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">
                            Total
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {statement.account.transactions.reduce((sum, t) => sum + t.kitta, 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            रु.{' '}
                            {statement.account.transactions
                              .reduce((sum, t) => sum + t.amount, 0)
                              .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2} className="px-6 py-4"></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
