import type { Metadata } from 'next';
import './globals.css';
import 'react-quill/dist/quill.snow.css';
import { AuthProvider } from '../contexts/AuthContext';
import { Layout } from '@/features/components/shared';
import { ErrorBoundaryWrapper } from '../components/ErrorBoundaryWrapper';

export const metadata: Metadata = {
  title: 'MyERP - Cooperative Management System',
  description: 'Modular Multi-Tenant SaaS ERP System',
};

import { Toaster } from '../components/ui/sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundaryWrapper>
          <AuthProvider>
            <Layout>{children}</Layout>
            <Toaster />
          </AuthProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
