'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export default function StatementPage({ params }: { params: { accountId: string } }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('member_token');
    if (!token) {
      router.push('/member/login');
      return;
    }

    const fetchStatement = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/member-portal/accounts/${params.accountId}/statement`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions);
          setAccountNumber(data.accountNumber);
        }
      } catch (error) {
        console.error('Failed to fetch statement', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [params.accountId, router]);

  if (loading) {
    return <div className="p-6">Loading statement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 border-b pb-4">
        <Link href="/member/accounts" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Statement</h1>
          <p className="text-gray-600">Account Number: {accountNumber}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                {/* <th className="px-6 py-3 font-medium text-right">Amount</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {format(new Date(t.date), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{t.description}</td>
                    {/* <td className="px-6 py-4 text-right font-medium text-gray-900">
                      NPR {t.amount}
                    </td> */}
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
