'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import NepaliDatePicker from '../../../components/NepaliDatePicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  fullName?: string;
}

interface SavingAccount {
  id: string;
  accountNumber: string;
  balance: number;
}

export default function IssueSharePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccount[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    date: new Date().toISOString().split('T')[0],
    kitta: '',
    unitPrice: '100',
    paymentMode: 'CASH' as 'CASH' | 'BANK' | 'SAVING',
    bankAccountId: '',
    savingAccountId: '',
    remarks: '',
  });

  useEffect(() => {
    fetchMembers();
    fetchBankAccounts();
  }, [token]);

  useEffect(() => {
    if (formData.memberId && formData.paymentMode === 'SAVING') {
      fetchSavingAccounts(formData.memberId);
    }
  }, [formData.memberId, formData.paymentMode]);

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

  const fetchSavingAccounts = async (memberId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/savings/accounts?memberId=${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSavingAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching saving accounts:', err);
    }
  };

  const fetchBankAccounts = async () => {
    if (!token) return;
    try {
      // Fetch bank accounts from chart of accounts
      const response = await fetch(`${API_URL}/general-ledger/assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter for bank accounts (you may need to adjust this based on your account structure)
        setBankAccounts(
          data.accounts?.filter(
            (acc: any) => acc.name.toLowerCase().includes('bank') || acc.code.startsWith('1002')
          ) || []
        );
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.memberNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount =
    formData.kitta && formData.unitPrice
      ? (parseInt(formData.kitta) * parseFloat(formData.unitPrice)).toFixed(2)
      : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.memberId || !formData.kitta || !formData.date) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.paymentMode === 'BANK' && !formData.bankAccountId) {
      setError('Please select a bank account');
      return;
    }

    if (formData.paymentMode === 'SAVING' && !formData.savingAccountId) {
      setError('Please select a saving account');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/shares/issue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: formData.memberId,
          kitta: parseInt(formData.kitta),
          date: formData.date,
          paymentMode: formData.paymentMode,
          bankAccountId: formData.bankAccountId || undefined,
          savingAccountId: formData.savingAccountId || undefined,
          remarks: formData.remarks,
        }),
      });

      if (response.ok) {
        router.push('/shares?success=issued');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to issue shares');
      }
    } catch (err) {
      setError('Error issuing shares');
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issue Share</h1>
          <p className="text-gray-600">Issue new shares to a member</p>
        </div>

        <div className="max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow border border-gray-200 p-6"
          >
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Member Select */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.memberName || searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowMemberDropdown(true);
                  }}
                  onFocus={() => setShowMemberDropdown(true)}
                  placeholder="Search by member number or name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {showMemberDropdown && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            memberId: member.id,
                            memberName: `${member.memberNumber} - ${member.firstName} ${member.lastName}`,
                          });
                          setSearchTerm('');
                          setShowMemberDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{member.memberNumber}</div>
                        <div className="text-sm text-gray-600">
                          {member.firstName} {member.lastName}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Date */}
            <div className="mb-6">
              <NepaliDatePicker
                value={formData.date}
                onChange={(dateString) => setFormData({ ...formData, date: dateString })}
                label="Transaction Date"
                required
              />
            </div>

            {/* Kitta and Unit Price */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No. of Kitta <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.kitta}
                  onChange={(e) => setFormData({ ...formData, kitta: e.target.value })}
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Price (रु.)
                </label>
                <input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Total Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount (रु.)
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <span className="text-lg font-semibold">रु. {totalAmount}</span>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMode: e.target.value as 'CASH' | 'BANK' | 'SAVING',
                    bankAccountId: '',
                    savingAccountId: '',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="SAVING">Saving Account Debit</option>
              </select>
            </div>

            {/* Bank Account (conditional) */}
            {formData.paymentMode === 'BANK' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select bank account...</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Saving Account (conditional) */}
            {formData.paymentMode === 'SAVING' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saving Account <span className="text-red-500">*</span>
                </label>
                {!formData.memberId ? (
                  <p className="text-sm text-gray-500">Please select a member first</p>
                ) : savingAccounts.length === 0 ? (
                  <p className="text-sm text-red-500">No saving accounts found for this member</p>
                ) : (
                  <select
                    value={formData.savingAccountId}
                    onChange={(e) => setFormData({ ...formData, savingAccountId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select saving account...</option>
                    {savingAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountNumber} - Balance: रु. {account.balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Remarks */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/shares"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Issuing...' : 'Issue Shares'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
