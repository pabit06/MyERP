'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Absolute import might need checking, use relative if unsure
import { Plus, Settings } from 'lucide-react';

export default function FDProductsPage() {
  const { token } = useAuth();
  interface FDProduct {
    id: string;
    name: string;
    interestRate: number;
    durationMonths: number;
    minAmount: number;
    postingFrequency: string;
    isActive: boolean;
  }
  const [products, setProducts] = useState<FDProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (!token) return;
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/fixed-deposits/products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [token, API_URL]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fixed Deposit Products
          </h1>
          <p className="text-slate-500">Manage interest rates and terms for fixed deposits.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Product
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Product Name</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Interest Rate</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Duration (Months)</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Min Amount</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No products found. Create one to get started.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">
                      {Number(product.interestRate).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-slate-600">{product.durationMonths}m</td>
                    <td className="px-6 py-4 text-slate-600">
                      NPR {Number(product.minAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 capitalize">
                      {product.postingFrequency.toLowerCase().replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4">
                      {product.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600">
                        <Settings className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
