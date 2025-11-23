import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productData: any) => Promise<void>;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { token } = useAuth();
  const [productForm, setProductForm] = useState({
    code: '',
    name: '',
    description: '',
    interestRate: '',
    minBalance: '',
    depositGLCode: '',
    interestExpenseGLCode: '',
  });
  const [liabilityAccounts, setLiabilityAccounts] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      fetchGLAccounts();
    }
  }, [isOpen, token]);

  const fetchGLAccounts = async () => {
    setLoadingAccounts(true);
    try {
      // Fetch Liabilities (for Deposits)
      const liabilityRes = await fetch(`${API_URL}/accounting/accounts?type=liability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Fetch Expenses (for Interest Expense)
      const expenseRes = await fetch(`${API_URL}/accounting/accounts?type=expense`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (liabilityRes.ok && expenseRes.ok) {
        const liabilities = await liabilityRes.json();
        const expenses = await expenseRes.json();

        // Filter for leaf nodes (not groups) and active accounts
        setLiabilityAccounts(liabilities.filter((acc: any) => !acc.isGroup && acc.isActive));
        setExpenseAccounts(expenses.filter((acc: any) => !acc.isGroup && acc.isActive));
      }
    } catch (err) {
      console.error('Error fetching GL accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      code: productForm.code,
      name: productForm.name,
      description: productForm.description,
      interestRate: parseFloat(productForm.interestRate),
      minBalance: parseFloat(productForm.minBalance),
      depositGLCode: productForm.depositGLCode,
      interestExpenseGLCode: productForm.interestExpenseGLCode,
    });
    setProductForm({
      code: '',
      name: '',
      description: '',
      interestRate: '',
      minBalance: '',
      depositGLCode: '',
      interestExpenseGLCode: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 my-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Savings Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
            <input
              type="text"
              required
              value={productForm.code}
              onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., SV001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Regular Savings"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (%) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={productForm.interestRate}
                onChange={(e) => setProductForm({ ...productForm, interestRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Balance ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={productForm.minBalance}
                onChange={(e) => setProductForm({ ...productForm, minBalance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Accounting Mapping</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit GL Account (Liability) *
                </label>
                <select
                  required
                  value={productForm.depositGLCode}
                  onChange={(e) =>
                    setProductForm({ ...productForm, depositGLCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={loadingAccounts}
                >
                  <option value="">Select a liability account</option>
                  {liabilityAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
                {loadingAccounts && (
                  <p className="text-xs text-gray-500 mt-1">Loading accounts...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Expense GL Account *
                </label>
                <select
                  required
                  value={productForm.interestExpenseGLCode}
                  onChange={(e) =>
                    setProductForm({ ...productForm, interestExpenseGLCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={loadingAccounts}
                >
                  <option value="">Select an expense account</option>
                  {expenseAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Product
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

export default CreateProductModal;
