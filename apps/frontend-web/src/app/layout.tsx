import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout';

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
