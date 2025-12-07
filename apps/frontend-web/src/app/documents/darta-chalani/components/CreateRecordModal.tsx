import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'darta' | 'chalani';
}

export default function CreateRecordModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab: _initialTab = 'darta',
}: CreateRecordModalProps) {
  const { token } = useAuth();
  const [showSelection, setShowSelection] = useState(true); // Show selection screen first
  const [activeTab, setActiveTab] = useState<'darta' | 'chalani' | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowSelection(true);
      setActiveTab(null);
      // Reset file states when modal opens
      setDartaFile(null);
      setChalaniFile(null);
      setUploadProgress({});
      setDartaDragActive(false);
      setChalaniDragActive(false);
    }
  }, [isOpen]);

  // Handle selection
  const handleSelectType = (type: 'darta' | 'chalani') => {
    setActiveTab(type);
    setShowSelection(false);
  };

  // --- Darta State ---
  const [dartaForm, setDartaForm] = useState({
    title: '',
    description: '',
    subject: '',
    category: '',
    priority: 'NORMAL',
    status: 'ACTIVE',
    remarks: '',
    senderName: '', // पत्र पठाउनेको नाम
    senderAddress: '', // पत्र पठाउनेको ठेगाना
    senderChalaniNo: '', // प्राप्त पत्रको चलानी नं.
    senderChalaniDate: '', // प्राप्त पत्रको मिति
    receivedDate: new Date().toISOString().split('T')[0], // दर्ता मिति
  });

  // --- Chalani State ---
  const [chalaniForm, setChalaniForm] = useState({
    type: 'OUTGOING',
    subject: '',
    content: '', // पत्रको ब्यहोरा
    category: '',
    status: 'DRAFT',
    priority: 'NORMAL',
    remarks: '',
    receiverName: '', // पत्र पाउनेको नाम
    receiverAddress: '',
    senderName: '', // Our office name
    senderAddress: '',
    date: new Date().toISOString().split('T')[0], // Letter date (पत्रको मिति)
    sentDate: '', // चलानी मिति
    transportMode: '', // Mode of delivery
    bodhartha: '', // CC (बोधार्थ)
    patraNumber: '', // Reference letter number
    replyToDartaId: '', // Link to Darta if replying
    fiscalYear: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // File upload states - separate for Darta and Chalani
  const [dartaFile, setDartaFile] = useState<File | null>(null);
  const [chalaniFile, setChalaniFile] = useState<File | null>(null);
  const [dartaDragActive, setDartaDragActive] = useState(false);
  const [chalaniDragActive, setChalaniDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ darta?: number; chalani?: number }>({});
  const [_departments, setDepartments] = useState<any[]>([]);
  const [_users, setUsers] = useState<any[]>([]);
  const dartaFileInputRef = useRef<HTMLInputElement>(null);
  const chalaniFileInputRef = useRef<HTMLInputElement>(null);

  // Get current fiscal year (Nepali)
  const getCurrentFiscalYear = () => {
    const year = new Date().getFullYear();
    const nepaliYear = year + 57;
    return `${String(nepaliYear - 1).slice(-2)}/${String(nepaliYear).slice(-2)}`;
  };

  useEffect(() => {
    if (isOpen && token) {
      setChalaniForm((prev) => ({ ...prev, fiscalYear: getCurrentFiscalYear() }));
      fetchDepartments();
      fetchUsers();
    }
  }, [isOpen, token]);

  const fetchDepartments = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/hrm/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/hrm/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // --- Handlers ---

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only PDF, JPG, PNG, and GIF files are allowed' };
    }

    return { valid: true };
  };

  const handleDrag = (e: React.DragEvent, type: 'darta' | 'chalani') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (type === 'darta') {
        setDartaDragActive(true);
      } else {
        setChalaniDragActive(true);
      }
    } else if (e.type === 'dragleave') {
      if (type === 'darta') {
        setDartaDragActive(false);
      } else {
        setChalaniDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'darta' | 'chalani') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'darta') {
      setDartaDragActive(false);
    } else {
      setChalaniDragActive(false);
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateFile(file);

      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        return;
      }

      if (type === 'darta') {
        setDartaFile(file);
      } else {
        setChalaniFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'darta' | 'chalani') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file);

      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        e.target.value = ''; // Reset input
        return;
      }

      if (type === 'darta') {
        setDartaFile(file);
      } else {
        setChalaniFile(file);
      }
    }
  };

  const handleDartaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/darta`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dartaForm),
      });

      if (response.ok) {
        const data = await response.json();
        const dartaId = data.darta?.id;

        // Upload file if provided
        if (dartaFile && dartaId) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', dartaFile);
          formDataUpload.append('title', dartaFile.name);

          try {
            setUploadProgress({ darta: 0 });
            const uploadResponse = await fetch(`${API_URL}/darta/${dartaId}/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formDataUpload,
            });

            if (!uploadResponse.ok) {
              throw new Error('File upload failed');
            }

            setUploadProgress({ darta: 100 });
            toast.success('File uploaded successfully');
          } catch (uploadErr) {
            console.error('File upload failed:', uploadErr);
            toast.error('Darta created but file upload failed');
          } finally {
            setUploadProgress({});
          }
        }

        toast.success('Darta created successfully');
        setDartaFile(null);
        onSuccess();
        onClose();
        // Reset form
        setDartaForm({
          title: '',
          description: '',
          subject: '',
          category: '',
          priority: 'NORMAL',
          status: 'ACTIVE',
          remarks: '',
          senderName: '',
          senderAddress: '',
          senderChalaniNo: '',
          senderChalaniDate: '',
          receivedDate: new Date().toISOString().split('T')[0],
        });
      } else {
        throw new Error('Failed to create darta');
      }
    } catch (err) {
      toast.error('Failed to create darta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChalaniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/patra-chalani`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...chalaniForm,
          // Map fields correctly
          fiscalYear: chalaniForm.fiscalYear || getCurrentFiscalYear(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const patraChalaniId = data.patraChalani?.id;

        if (chalaniFile && patraChalaniId) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', chalaniFile);
          formDataUpload.append('title', chalaniFile.name);

          try {
            setUploadProgress({ chalani: 0 });
            const uploadResponse = await fetch(
              `${API_URL}/patra-chalani/${patraChalaniId}/upload`,
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload,
              }
            );

            if (!uploadResponse.ok) {
              throw new Error('File upload failed');
            }

            setUploadProgress({ chalani: 100 });
            toast.success('File uploaded successfully');
          } catch (uploadErr) {
            console.error('File upload failed:', uploadErr);
            toast.error('Chalani created but file upload failed');
          } finally {
            setUploadProgress({});
          }
        }

        toast.success('Chalani created successfully');
        setChalaniFile(null);
        onSuccess();
        onClose();
        // Reset form logic could go here
      } else {
        throw new Error('Failed to create chalani');
      }
    } catch (err) {
      toast.error('Failed to create chalani');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Selection Screen
  if (showSelection) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Add New Entry</h2>
                <p className="text-white/90 text-sm">
                  Choose the type of document you want to register
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Selection Cards */}
          <div className="p-8 grid md:grid-cols-2 gap-6">
            {/* Darta Card */}
            <button
              onClick={() => handleSelectType('darta')}
              className="group relative bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 hover:border-green-400 hover:shadow-xl transition-all transform hover:scale-105 text-left"
            >
              <div className="absolute top-4 right-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform">
                📥
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">दर्ता (Darta)</h3>
                <p className="text-gray-600 mb-4">Register incoming documents and letters</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Incoming letters & documents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Track sender information</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Reference number tracking</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-green-200">
                  <span className="text-green-700 font-semibold group-hover:text-green-800">
                    Register Darta →
                  </span>
                </div>
              </div>
            </button>

            {/* Chalani Card */}
            <button
              onClick={() => handleSelectType('chalani')}
              className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-8 hover:border-blue-400 hover:shadow-xl transition-all transform hover:scale-105 text-left"
            >
              <div className="absolute top-4 right-4 w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform">
                📤
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">चलानी (Chalani)</h3>
                <p className="text-gray-600 mb-4">Create and dispatch outgoing letters</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Outgoing correspondence</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Track dispatch details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>CC & attachment support</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <span className="text-blue-700 font-semibold group-hover:text-blue-800">
                    Create Chalani →
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form Screen
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`
        transition-all duration-300 ease-in-out
        bg-gradient-to-br rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl border-4 flex flex-col
        ${activeTab === 'darta' ? 'from-green-50 to-white border-green-600' : 'from-blue-50 to-white border-blue-600'}
      `}
      >
        {/* Unified Header */}
        <div
          className={`
          px-8 py-4 text-white flex-shrink-0 transition-colors duration-300
          ${activeTab === 'darta' ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'}
        `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSelection(true)}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                title="Back to selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div>
                <h2 className="text-2xl font-bold">
                  {activeTab === 'darta' ? 'Register Darta (दर्ता)' : 'Create Chalani (चलानी)'}
                </h2>
                <p className="text-white/80 text-sm">
                  {activeTab === 'darta' ? 'Register incoming document' : 'Create outgoing letter'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {activeTab === 'darta' && (
            // --- DARTA FORM ---
            <form onSubmit={handleDartaSubmit} className="space-y-6 animate-fadeIn">
              {/* Basic Information */}
              <div className="bg-white/50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-green-600">📋</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={dartaForm.title}
                      onChange={(e) => setDartaForm({ ...dartaForm, title: e.target.value })}
                      required
                      placeholder="Enter document title"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject (विषय)
                    </label>
                    <input
                      type="text"
                      value={dartaForm.subject}
                      onChange={(e) => setDartaForm({ ...dartaForm, subject: e.target.value })}
                      placeholder="Enter subject matter"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={dartaForm.category}
                      onChange={(e) => setDartaForm({ ...dartaForm, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    >
                      <option value="">Select Category</option>
                      <option value="GOVERNMENT_NOTICE">Government Notice</option>
                      <option value="LOAN_REQUEST">Loan Request</option>
                      <option value="MEMBER_APPLICATION">Member Application</option>
                      <option value="COMPLAINT">Complaint</option>
                      <option value="LEGAL_DOCUMENT">Legal Document</option>
                      <option value="FINANCIAL_REPORT">Financial Report</option>
                      <option value="MEETING_MINUTE">Meeting Minute</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={dartaForm.priority}
                      onChange={(e) => setDartaForm({ ...dartaForm, priority: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={dartaForm.description}
                      onChange={(e) => setDartaForm({ ...dartaForm, description: e.target.value })}
                      rows={3}
                      placeholder="Brief description of the document..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm resize-none hover:border-green-400"
                    />
                  </div>
                </div>
              </div>

              {/* Sender Information */}
              <div className="bg-white/50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-green-600">👤</span>
                  पत्र पठाउनेको विवरण (Sender Information)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sender Name (पठाउनेको नाम) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={dartaForm.senderName}
                      onChange={(e) => setDartaForm({ ...dartaForm, senderName: e.target.value })}
                      required
                      placeholder="Organization or Person Name"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sender Address (ठेगाना)
                    </label>
                    <input
                      type="text"
                      value={dartaForm.senderAddress}
                      onChange={(e) =>
                        setDartaForm({ ...dartaForm, senderAddress: e.target.value })
                      }
                      placeholder="Sender's address"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      प्राप्त पत्रको चलानी नं. (Sender's Letter No.)
                    </label>
                    <input
                      type="text"
                      value={dartaForm.senderChalaniNo}
                      onChange={(e) =>
                        setDartaForm({ ...dartaForm, senderChalaniNo: e.target.value })
                      }
                      placeholder="Reference number from sender"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      प्राप्त पत्रको मिति (Sender's Letter Date)
                    </label>
                    <input
                      type="date"
                      value={dartaForm.senderChalaniDate}
                      onChange={(e) =>
                        setDartaForm({ ...dartaForm, senderChalaniDate: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      दर्ता मिति (Registration Date) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dartaForm.receivedDate}
                      onChange={(e) => setDartaForm({ ...dartaForm, receivedDate: e.target.value })}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm hover:border-green-400"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white/50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-green-600">📝</span>
                  Additional Information
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks (कैफियत)
                    </label>
                    <textarea
                      value={dartaForm.remarks}
                      onChange={(e) => setDartaForm({ ...dartaForm, remarks: e.target.value })}
                      rows={3}
                      placeholder="Any additional remarks or notes..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white shadow-sm resize-none hover:border-green-400"
                    />
                  </div>

                  {/* File Upload Section */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Attachment (संलग्न कागजात)
                    </label>
                    <div
                      onDragEnter={(e) => handleDrag(e, 'darta')}
                      onDragLeave={(e) => handleDrag(e, 'darta')}
                      onDragOver={(e) => handleDrag(e, 'darta')}
                      onDrop={(e) => handleDrop(e, 'darta')}
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                        dartaDragActive
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-gray-50 hover:border-green-400'
                      }`}
                    >
                      <input
                        type="file"
                        ref={dartaFileInputRef}
                        onChange={(e) => handleFileChange(e, 'darta')}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                      {!dartaFile ? (
                        <div className="space-y-2">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-sm text-gray-600">Drag and drop document here or</p>
                          <button
                            type="button"
                            onClick={() => dartaFileInputRef.current?.click()}
                            className="text-green-600 font-medium hover:text-green-700 text-sm"
                          >
                            Browse Files
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            Supports: PDF, JPG, PNG, GIF (Max 10MB)
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-white p-3 rounded border border-green-200">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg
                              className="w-8 h-8 text-green-600 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {dartaFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(dartaFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDartaFile(null)}
                            className="text-red-500 hover:text-red-700 ml-3 flex-shrink-0"
                            title="Remove file"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                      {uploadProgress.darta !== undefined && uploadProgress.darta < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.darta}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  {submitting ? 'Registering...' : 'Register Darta'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'chalani' && (
            // --- CHALANI FORM ---
            <form onSubmit={handleChalaniSubmit} className="space-y-6 animate-fadeIn">
              {/* Basic Information */}
              <div className="bg-white/50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-blue-600">📋</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fiscal Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={chalaniForm.fiscalYear}
                      onChange={(e) =>
                        setChalaniForm({ ...chalaniForm, fiscalYear: e.target.value })
                      }
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value={getCurrentFiscalYear()}>{getCurrentFiscalYear()}</option>
                      <option value="081/082">081/082</option>
                      <option value="080/081">080/081</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={chalaniForm.type}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, type: e.target.value })}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value="OUTGOING">Outgoing (बाहिर पठाइने)</option>
                      <option value="INTERNAL">Internal (आन्तरिक)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject (विषय) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chalaniForm.subject}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, subject: e.target.value })}
                      required
                      placeholder="Enter subject..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Content (पत्रको ब्यहोरा)
                    </label>
                    <textarea
                      value={chalaniForm.content}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, content: e.target.value })}
                      rows={4}
                      placeholder="Letter content/details..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm resize-none hover:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={chalaniForm.category}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value="">Select Category</option>
                      <option value="OFFICIAL_CORRESPONDENCE">Official Correspondence</option>
                      <option value="MEMBER_COMMUNICATION">Member Communication</option>
                      <option value="GOVERNMENT_REPLY">Government Reply</option>
                      <option value="INTERNAL_MEMO">Internal Memo</option>
                      <option value="FINANCIAL_DOCUMENT">Financial Document</option>
                      <option value="LEGAL_DOCUMENT">Legal Document</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={chalaniForm.priority}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, priority: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={chalaniForm.status}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, status: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="APPROVED">Approved</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Receiver Information */}
              <div className="bg-white/50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-blue-600">👤</span>
                  पत्र पाउनेको विवरण (Receiver Information)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Receiver Name (पाउनेको नाम) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chalaniForm.receiverName}
                      onChange={(e) =>
                        setChalaniForm({ ...chalaniForm, receiverName: e.target.value })
                      }
                      required
                      placeholder="Recipient Name / Office"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Receiver Address (ठेगाना)
                    </label>
                    <input
                      type="text"
                      value={chalaniForm.receiverAddress}
                      onChange={(e) =>
                        setChalaniForm({ ...chalaniForm, receiverAddress: e.target.value })
                      }
                      placeholder="Recipient address"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Dispatch Details */}
              <div className="bg-white/50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-blue-600">📅</span>
                  Dispatch Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Letter Date (पत्रको मिति) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={chalaniForm.date}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, date: e.target.value })}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sent Date (चलानी मिति)
                    </label>
                    <input
                      type="date"
                      value={chalaniForm.sentDate}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, sentDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mode of Delivery (माध्यम)
                    </label>
                    <select
                      value={chalaniForm.transportMode}
                      onChange={(e) =>
                        setChalaniForm({ ...chalaniForm, transportMode: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value="">Select...</option>
                      <option value="Email">Email</option>
                      <option value="Post Office">Post Office</option>
                      <option value="By Hand">By Hand</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reference Letter No. (पत्र नं.)
                    </label>
                    <input
                      type="text"
                      value={chalaniForm.patraNumber}
                      onChange={(e) =>
                        setChalaniForm({ ...chalaniForm, patraNumber: e.target.value })
                      }
                      placeholder="If replying to external letter"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm hover:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* CC & Additional Info */}
              <div className="bg-white/50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-blue-600">📧</span>
                  Additional Information
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      बोधार्थ (CC - Carbon Copy)
                    </label>
                    <textarea
                      value={chalaniForm.bodhartha}
                      onChange={(e) =>
                        setChalaniForm({ ...chalaniForm, bodhartha: e.target.value })
                      }
                      rows={3}
                      placeholder="List departments/orgs to be informed (CC)..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm resize-none hover:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={chalaniForm.remarks}
                      onChange={(e) => setChalaniForm({ ...chalaniForm, remarks: e.target.value })}
                      rows={3}
                      placeholder="Any additional remarks..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm resize-none hover:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Attachment (संलग्न कागजात)
                    </label>
                    <div
                      onDragEnter={(e) => handleDrag(e, 'chalani')}
                      onDragLeave={(e) => handleDrag(e, 'chalani')}
                      onDragOver={(e) => handleDrag(e, 'chalani')}
                      onDrop={(e) => handleDrop(e, 'chalani')}
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                        chalaniDragActive
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-gray-50 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="file"
                        ref={chalaniFileInputRef}
                        onChange={(e) => handleFileChange(e, 'chalani')}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                      {!chalaniFile ? (
                        <div className="space-y-2">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-sm text-gray-600">Drag and drop document here or</p>
                          <button
                            type="button"
                            onClick={() => chalaniFileInputRef.current?.click()}
                            className="text-blue-600 font-medium hover:text-blue-700 text-sm"
                          >
                            Browse Files
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            Supports: PDF, JPG, PNG (Max 10MB)
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg
                              className="w-8 h-8 text-blue-600 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {chalaniFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(chalaniFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setChalaniFile(null)}
                            className="text-red-500 hover:text-red-700 ml-3 flex-shrink-0"
                            title="Remove file"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                      {uploadProgress.chalani !== undefined && uploadProgress.chalani < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.chalani}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  {submitting ? 'Creating...' : 'Create Chalani'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
