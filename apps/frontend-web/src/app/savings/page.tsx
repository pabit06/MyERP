'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast';

import SavingsHeader from './components/SavingsHeader';
import SavingsTabs from './components/SavingsTabs';
import AccountList from './components/AccountList';
import ProductList from './components/ProductList';
import CreateAccountModal from './components/CreateAccountModal';
import CreateProductModal from './components/CreateProductModal';
import InterestOperations from './components/InterestOperations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SavingProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  interestRate: number;
  minBalance: number;
  isActive: boolean;
}

interface SavingAccount {
  id: string;
  accountNumber: string;
  memberId: string;
  productId: string;
  balance: number;
  status: string;
  member?: {
    memberNumber: string;
    firstName: string;
    lastName: string;
  };
  product?: {
    name: string;
  };
}

export default function SavingsPage() {
  const { token, hasModule } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'accounts' | 'operations'>('accounts');
  const [products, setProducts] = useState<SavingProduct[]>([]);
  const [accounts, setAccounts] = useState<SavingAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (!hasModule('cbs')) {
      setError('CBS module is not enabled for your subscription');
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [token, hasModule, activeTab]);

  const fetchData = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const endpoint = activeTab === 'products' ? 'savings/products' : 'savings/accounts';
      const response = await fetch(`${API_URL}/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (activeTab === 'products') {
          setProducts(data.products || []);
        } else {
          setAccounts(data.accounts || []);
        }
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (err) {
      setError('Error loading data');
      toast.error('Could not fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (productData: any) => {
    if (!token) return;

    const toastId = toast.loading('Creating product...');
    try {
      // 1. Create the product
      const response = await fetch(`${API_URL}/savings/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: productData.code,
          name: productData.name,
          description: productData.description,
          interestRate: productData.interestRate,
          minimumBalance: productData.minimumBalance,
          interestPostingFrequency: productData.interestPostingFrequency,
          interestCalculationMethod: productData.interestCalculationMethod,
          isTaxApplicable: productData.isTaxApplicable,
          taxRate: productData.taxRate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create product');
      }

      const { product } = await response.json();

      // 2. If GL codes are provided, map them
      if (productData.depositGLCode || productData.interestExpenseGLCode) {
        toast.loading('Configuring accounting...', { id: toastId });

        const mappingResponse = await fetch(`${API_URL}/accounting/product-gl-map`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productType: 'saving',
            productId: product.id,
            mapping: {
              depositGLCode: productData.depositGLCode,
              interestExpenseGLCode: productData.interestExpenseGLCode,
            },
          }),
        });

        if (!mappingResponse.ok) {
          console.error('Failed to map GL accounts');
          toast.error('Product created but GL mapping failed.', { id: toastId, duration: 4000 });
          setShowProductModal(false);
          fetchData();
          return;
        }
      }

      toast.success('Product created successfully', { id: toastId });
      setShowProductModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating product', { id: toastId });
    }
  };

  const handleCreateAccount = async (accountData: {
    memberId: string;
    productId: string;
    accountNumber: string;
    initialDeposit?: number;
    nominee?: any;
  }) => {
    if (!token) return;

    const toastId = toast.loading('Opening account...');
    try {
      const response = await fetch(`${API_URL}/savings/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (response.ok) {
        toast.success('Account opened successfully', { id: toastId });
        setShowAccountModal(false);
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create account');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating account', { id: toastId });
    }
  };

  if (!hasModule('cbs')) {
    return (
      <ProtectedRoute>
        <div className="space-y-6 text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg max-w-md mx-auto">
            <h3 className="font-bold text-lg">CBS Module Not Enabled</h3>
            <p className="text-sm">Please upgrade your subscription to access Savings features.</p>
          </div>
          <Link
            href="/subscription"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            View Subscription Plans
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <SavingsHeader
          activeTab={activeTab}
          onAddProduct={() => setShowProductModal(true)}
          onOpenAccount={() => setShowAccountModal(true)}
        />
        <SavingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : activeTab === 'accounts' ? (
          <AccountList accounts={accounts} />
        ) : activeTab === 'operations' ? (
          <InterestOperations onRefresh={fetchData} />
        ) : (
          <ProductList products={products} />
        )}

        <CreateProductModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          onSubmit={handleCreateProduct}
        />

        <CreateAccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          onSubmit={handleCreateAccount}
          products={products}
        />
      </div>
    </ProtectedRoute>
  );
}
