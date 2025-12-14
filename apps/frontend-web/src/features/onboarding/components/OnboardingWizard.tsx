'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Globe,
  Phone,
} from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: WizardStep[] = [
  {
    id: 'profile',
    title: 'Organization Details',
    description: 'Set up your cooperative profile',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    id: 'settings',
    title: 'Operational Setup',
    description: 'Configure fiscal year and dates',
    icon: <Calendar className="w-6 h-6" />,
  },
];

export default function OnboardingWizard() {
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    website: '',
    description: '',
    operationStartDate: new Date().toISOString().split('T')[0], // Default to today
  });

  useEffect(() => {
    // Check if profile is complete
    const checkProfile = async () => {
      try {
        const data = await apiClient.get<{ profile?: { address?: string } }>(
          '/onboarding/profile',
          {
            skipErrorToast: true, // Don't annoy user if check fails silently
          }
        );
        // If address is missing, show wizard
        if (data.profile && !data.profile.address) {
          setShowWizard(true);
        }
      } catch (error) {
        console.error('Failed to check profile', error);
      }
    };

    if (token) {
      checkProfile();
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      if (currentStep === 0) {
        // Save Profile
        await apiClient.put('/onboarding/profile', {
          address: formData.address,
          phone: formData.phone,
          website: formData.website,
          description: formData.description,
        });
        toast.success('Organization details saved');
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // Save Settings (Date)
        await apiClient.put('/onboarding/settings', {
          operationStartDate: formData.operationStartDate,
        });
        toast.success('Setup completed successfully!');
        setShowWizard(false);
        router.refresh(); // Refresh to update dashboard state if needed
      }
    } catch (error) {
      console.error('Failed to save', error);
      // apiClient handles most error toasts, but we can add specific ones if needed
    } finally {
      setIsLoading(false);
    }
  };

  if (!showWizard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">Welcome to MyERP</h2>
            <p className="text-indigo-100 mt-1">
              Let&apos;s get your cooperative set up in just a few steps.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    index <= currentStep
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  } transition-colors duration-200`}
                >
                  {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${index <= currentStep ? 'text-indigo-900' : 'text-slate-500'}`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 mx-4 h-0.5 ${index < currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900">Organization Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cooperative Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g. Kathmandu, Nepal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="+977-1-..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Tell us a bit about your cooperative..."
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900">Operational Setup</h3>
                <p className="text-sm text-slate-600">
                  Select the date from which you want to start recording operations in this system.
                  This is typically the start of your current fiscal year or today&apos;s date so
                  that accounting entries have a logical starting point.
                </p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Operation Start Date (Fiscal Year Start)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="operationStartDate"
                      value={formData.operationStartDate}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    All financial reports and dashboards will calculate data starting from this
                    date.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-end">
          <button
            onClick={handleNext}
            disabled={isLoading || (currentStep === 0 && !formData.address)}
            className="flex items-center justify-center py-2 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading
              ? 'Saving...'
              : currentStep === steps.length - 1
                ? 'Finish Setup'
                : 'Next Step'}
            {!isLoading && currentStep < steps.length - 1 && (
              <ChevronRight className="ml-2 h-4 w-4" />
            )}
            {!isLoading && currentStep === steps.length - 1 && (
              <CheckCircle2 className="ml-2 h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
