'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function QRPage({ params }: { params: { accountId: string } }) {
  const router = useRouter();
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('member_token');
    if (!token) {
      router.push('/member/login');
      return;
    }

    const fetchQR = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/member-portal/accounts/${params.accountId}/qr`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setPayload(data.payload);
        }
      } catch (error) {
        console.error('Failed to fetch QR payload', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, [params.accountId, router]);

  if (loading) {
    return <div className="p-6">Loading QR Code...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 border-b pb-4">
        <Link href="/member/accounts" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receive Payment</h1>
          <p className="text-gray-600">Scan this QR code to deposit funds.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-8 py-8 bg-white rounded-lg border shadow-sm">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          {payload && <QRCode value={payload} size={256} level="H" viewBox={`0 0 256 256`} />}
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">Scan via Fonepay or NepalPay</p>
          <p className="text-xs text-gray-400 mt-1">This QR is unique to your account.</p>
        </div>

        {/* <button className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium">
            <Download className="h-4 w-4" />
            <span>Download Image</span>
        </button> */}
      </div>
    </div>
  );
}
