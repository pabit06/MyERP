import React from 'react';

interface SavingsHeaderProps {
  activeTab: 'products' | 'accounts';
  onAddProduct: () => void;
  onOpenAccount: () => void;
}

const SavingsHeader: React.FC<SavingsHeaderProps> = ({
  activeTab,
  onAddProduct,
  onOpenAccount,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Savings Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage savings products and accounts</p>
      </div>
      <div className="flex space-x-3">
        {activeTab === 'products' ? (
          <button
            onClick={onAddProduct}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Add Product
          </button>
        ) : (
          <button
            onClick={onOpenAccount}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Open Account
          </button>
        )}
      </div>
    </div>
  );
};

export default SavingsHeader;
