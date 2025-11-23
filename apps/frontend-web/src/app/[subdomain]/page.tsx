'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface PublicPageProps {
  params: {
    subdomain: string;
  };
}

interface CooperativeProfile {
  id: string;
  name: string;
  subdomain: string;
  profile: {
    description?: string;
    logoUrl?: string;
    website?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export default function PublicPage({ params }: PublicPageProps) {
  const { subdomain } = params;
  const [cooperative, setCooperative] = useState<CooperativeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/public/profile/${subdomain}`);
        if (!response.ok) {
          throw new Error('Cooperative not found');
        }
        const data = await response.json();
        setCooperative(data.cooperative);
      } catch (err: any) {
        setError(err.message || 'Unable to load cooperative information');
      } finally {
        setIsLoading(false);
      }
    };

    if (subdomain) {
      fetchProfile();
    }
  }, [subdomain]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !cooperative) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cooperative Not Found</h1>
          <p className="text-gray-600">
            {error || "The cooperative you're looking for doesn't exist."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center mb-8">
            {cooperative.profile.logoUrl && (
              <img
                src={cooperative.profile.logoUrl}
                alt={cooperative.name}
                className="mx-auto h-24 w-24 rounded-full mb-4"
              />
            )}
            <h1 className="text-4xl font-bold text-gray-900">{cooperative.name}</h1>
            {cooperative.profile.description && (
              <p className="mt-4 text-lg text-gray-600">{cooperative.profile.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {cooperative.profile.address && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p className="mt-1 text-gray-900">{cooperative.profile.address}</p>
              </div>
            )}
            {cooperative.profile.phone && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="mt-1 text-gray-900">{cooperative.profile.phone}</p>
              </div>
            )}
            {cooperative.profile.email && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-gray-900">{cooperative.profile.email}</p>
              </div>
            )}
            {cooperative.profile.website && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Website</h3>
                <a
                  href={cooperative.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-indigo-600 hover:text-indigo-800"
                >
                  {cooperative.profile.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
