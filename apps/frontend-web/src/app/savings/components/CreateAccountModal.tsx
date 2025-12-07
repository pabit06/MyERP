import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

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
  const { token } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [accountForm, setAccountForm] = useState({
    memberId: '',
    productId: '',
    accountNumber: '',
    initialDeposit: '',
    nominee: {
      name: '',
      relation: '',
      citizenship: '',
      photo: '',
    },
  });

  const searchMembers = async (query: string) => {
    if (!query || !token) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/members?search=${query}&status=active`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error searching members:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomineeData =
      accountForm.nominee.name || accountForm.nominee.relation
        ? {
            name: accountForm.nominee.name,
            relation: accountForm.nominee.relation,
            citizenship: accountForm.nominee.citizenship || undefined,
            photo: accountForm.nominee.photo || undefined,
          }
        : undefined;

    await onSubmit({
      ...accountForm,
      initialDeposit: accountForm.initialDeposit
        ? parseFloat(accountForm.initialDeposit)
        : undefined,
      nominee: nomineeData,
    });
    setAccountForm({
      memberId: '',
      productId: '',
      accountNumber: '',
      initialDeposit: '',
      nominee: {
        name: '',
        relation: '',
        citizenship: '',
        photo: '',
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Open Savings Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={accountForm.accountNumber}
              onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              placeholder="Auto-generated if empty"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to auto-generate account number
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type to search member..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-2"
                onChange={(e) => searchMembers(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-3 top-3 text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
            <div className="relative">
              <select
                required
                value={accountForm.memberId}
                onChange={(e) => setAccountForm({ ...accountForm, memberId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                size={5}
              >
                <option value="" disabled className="text-gray-500 font-medium bg-gray-50">
                  Select a member below
                </option>
                {members.length > 0 ? (
                  members.map((member) => (
                    <option key={member.id} value={member.id} className="py-1">
                      {member.firstName} {member.lastName} ({member.memberNumber || 'No ID'}) -{' '}
                      {member.email || member.phone || 'No Contact'}
                    </option>
                  ))
                ) : (
                  <option disabled>No members found</option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">Start typing above to find a member</p>
            </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Deposit (NPR)
            </label>
            <input
              type="number"
              step="0.01"
              value={accountForm.initialDeposit}
              onChange={(e) => setAccountForm({ ...accountForm, initialDeposit: e.target.value })}
              placeholder="Optional initial deposit amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Nominee Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominee Name</label>
                <input
                  type="text"
                  value={accountForm.nominee.name}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      nominee: { ...accountForm.nominee, name: e.target.value },
                    })
                  }
                  placeholder="Full name of nominee"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                <input
                  type="text"
                  value={accountForm.nominee.relation}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      nominee: { ...accountForm.nominee, relation: e.target.value },
                    })
                  }
                  placeholder="e.g., Spouse, Son, Daughter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Citizenship Number
                </label>
                <input
                  type="text"
                  value={accountForm.nominee.citizenship}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      nominee: { ...accountForm.nominee, citizenship: e.target.value },
                    })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
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
