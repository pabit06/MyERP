import React, { useState } from 'react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transactionData: any) => Promise<void>;
  accountId: string;
  accountNumber: string;
  currentBalance: number;
  type: 'deposit' | 'withdraw';
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
  accountNumber,
  currentBalance,
  type,
}) => {
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    paymentMode: 'CASH',
    remarks: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      accountId,
      amount: parseFloat(transactionForm.amount),
      paymentMode: transactionForm.paymentMode,
      remarks: transactionForm.remarks || undefined,
      date: transactionForm.date ? new Date(transactionForm.date) : undefined,
    });
    setTransactionForm({
      amount: '',
      paymentMode: 'CASH',
      remarks: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {type === 'deposit' ? 'Deposit' : 'Withdraw'} - Account {accountNumber}
        </h2>
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className="text-lg font-semibold text-gray-900">
            NPR {Number(currentBalance).toLocaleString('en-NP', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (NPR) *</label>
            <input
              type="number"
              step="0.01"
              required
              min={0.01}
              value={transactionForm.amount}
              onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
            <select
              required
              value={transactionForm.paymentMode}
              onChange={(e) =>
                setTransactionForm({ ...transactionForm, paymentMode: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
            <input
              type="date"
              value={transactionForm.date}
              onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={transactionForm.remarks}
              onChange={(e) => setTransactionForm({ ...transactionForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Optional remarks"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-lg ${
                type === 'deposit'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {type === 'deposit' ? 'Deposit' : 'Withdraw'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
