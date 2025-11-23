import React, { useState } from 'react';

interface SavingProduct {
  id: string;
  name: string;
  isActive: boolean;
}

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountData: any) => Promise<void>;
  products: SavingProduct[];
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  products,
}) => {
  const [accountForm, setAccountForm] = useState({
    memberId: '',
    productId: '',
    accountNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(accountForm);
    setAccountForm({ memberId: '', productId: '', accountNumber: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Open Savings Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
            <input
              type="text"
              required
              value={accountForm.accountNumber}
              onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              placeholder="Enter account number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member ID *</label>
            <input
              type="text"
              required
              value={accountForm.memberId}
              onChange={(e) => setAccountForm({ ...accountForm, memberId: e.target.value })}
              placeholder="Enter member ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select
              required
              value={accountForm.productId}
              onChange={(e) => setAccountForm({ ...accountForm, productId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a product</option>
              {products
                .filter((p) => p.isActive)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create
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

export default CreateAccountModal;
