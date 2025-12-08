'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewFDAccountPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  interface FDProduct {
    id: string;
    name: string;
    interestRate: number;
  }
  const [products, setProducts] = useState<FDProduct[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    // Fetch active products
    if (!token) return;
    fetch(`${API_URL}/fixed-deposits/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, [token, API_URL]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Collect form data
    const formData = new FormData(e.currentTarget);
    const payload = {
      memberId: formData.get('memberId'),
      productId: formData.get('productId'),
      amount: Number(formData.get('amount')),
      // Simple logic: if cash code provided, use it. Else assume savings (sourceAccountId via logic or UI selector)
      // For MVP, simplistic UI:
      cashAccountCode: formData.get('fundingSource') === 'cash' ? '00-10100-01-00001' : undefined,
      sourceAccountId:
        formData.get('fundingSource') === 'savings' ? formData.get('sourceAccountId') : undefined,
      nomineeName: formData.get('nomineeName'),
      remarks: formData.get('remarks'),
    };

    try {
      const res = await fetch(`${API_URL}/fixed-deposits/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      router.push('/fixed-deposits/accounts');
    } catch (error) {
      alert('Failed to create account: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/fixed-deposits/accounts"
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            New Fixed Deposit Account
          </h1>
          <p className="text-slate-500">Open a new FD account for a member.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm font-sans">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Member ID</label>
              <input
                name="memberId"
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Select Member..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Product</label>
              <select
                name="productId"
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select Scheme...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({Number(p.interestRate)}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Deposit Amount</label>
              <input
                name="amount"
                type="number"
                required
                min="0"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Funding Source</label>
              <select
                name="fundingSource"
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="cash">Cash Deposit</option>
                {/* <option value="savings">Savings Account Transfer</option> */}
                {/* Simplified for MVP */}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nominee Name</label>
            <input
              name="nomineeName"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              name="remarks"
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/fixed-deposits/accounts"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Open Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
