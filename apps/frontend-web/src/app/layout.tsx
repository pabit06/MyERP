import type { Metadata } from 'next';
import './globals.css';
import 'react-quill/dist/quill.snow.css';
import { AuthProvider } from '../contexts/AuthContext';
import { Layout } from '@/features/components/shared';

export const metadata: Metadata = {
  title: 'MyERP - Cooperative Management System',
  description: 'Modular Multi-Tenant SaaS ERP System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}
