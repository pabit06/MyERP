'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface MemberWorkflowProps {
  memberId: string;
  workflowStatus: string;
  onStatusChange: () => void;
  createdAt?: string; // Add createdAt prop for application date
}

interface KYM {
  dateOfBirth?: string | Date;
  dateOfBirthBS?: string;
  gender?: string;
  nationality?: string;
  citizenshipNumber?: string;
  citizenshipIssuingOffice?: string;
  citizenshipIssuingDistrict?: string;
  grandfatherName?: string;
  fatherName?: string;
  motherName?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseSurname?: string;
  familyType?: string;
  occupation?: string;
  occupationSpecify?: string;
  panNo?: string;
  spouseOccupation?: string;
  spouseOccupationSpecify?: string;
  isHighRankingPositionHolder?: boolean;
  pepName?: string;
  pepRelationship?: string;
  pepPosition?: string;
  permanentProvince?: string;
  permanentMunicipality?: string;
  permanentWard?: string;
  permanentVillageTole?: string;
  permanentHouseNo?: string;
  temporaryProvince?: string;
  temporaryMunicipality?: string;
  temporaryWard?: string;
  temporaryVillageTole?: string;
  temporaryHouseNo?: string;
  residenceType?: string;
  contactNo?: string;
  emailId?: string;
  voterIdCardNo?: string;
  pollingStation?: string;
  residenceDuration?: string;
  passportNo?: string;
  membershipObjective?: string;
  isMemberOfAnotherCooperative?: boolean;
  isFamilyMemberOfAnotherCooperative?: boolean;
  isAnotherFamilyMemberInThisInstitution?: boolean;
  dualMembershipPurpose?: string;
  familyDualMembershipPurpose?: string;
  annualFamilyIncome?: string;
  initialShareAmount?: number;
  initialSavingsAmount?: number;
  initialOtherAmount?: number;
  initialOtherSpecify?: string;
  estimatedTransactionsPerYear?: number;
  estimatedAnnualDeposit?: number;
  estimatedLoanAmount?: number;
  additionalRemarks?: string;
  declarationChangeAgreement?: boolean;
  declarationTruthfulness?: boolean;
  declarationDate?: string | Date;
  recommender1Name?: string;
  recommender1MembershipNo?: string;
  recommender2Name?: string;
  recommender2MembershipNo?: string;
  [key: string]: unknown; // Allow additional properties
}

interface WorkflowHistory {
  id: string;
  memberId: string;
  fromStatus?: string;
  toStatus: string;
  action: string;
  performedBy?: string;
  remarks?: string;
  createdAt: string;
  [key: string]: unknown; // Allow additional properties
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: string;
  meetingNo?: number;
  date?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  workflowStatus?: string;
  [key: string]: unknown; // Allow additional properties
}

const WORKFLOW_STEPS = [
  { key: 'application', label: 'Application', color: 'gray' },
  { key: 'under_review', label: 'Under Review', color: 'yellow' },
  { key: 'approved', label: 'Approved', color: 'green' },
  { key: 'bod_pending', label: 'BOD Pending', color: 'purple' },
  { key: 'active', label: 'Active', color: 'green' },
  { key: 'rejected', label: 'Rejected', color: 'red' },
];

export default function MemberWorkflow({
  memberId,
  workflowStatus,
  onStatusChange,
  createdAt,
}: MemberWorkflowProps) {
  const { token } = useAuth();
  const [kym, setKym] = useState<KYM | null>(null);
  const [history, setHistory] = useState<WorkflowHistory[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [showKYMForm, setShowKYMForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showBODModal, setShowBODModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<
    'approve' | 'reject' | 'review' | 'complete_review'
  >('review');
  const [remarks, setRemarks] = useState('');
  const [_meetingId, setMeetingId] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reviewCompleted, setReviewCompleted] = useState(false);

  const fetchWorkflowData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [kycRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/member-workflow/${memberId}/kyc`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/member-workflow/${memberId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (kycRes.ok) {
        const kymData = await kycRes.json();
        setKym(kymData.kyc); // Backend still returns 'kyc' property
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (err) {
      console.error('Error fetching workflow data:', err);
      // Error is logged, no further action needed
    } finally {
      setIsLoading(false);
    }
  }, [memberId, token]);

  useEffect(() => {
    fetchWorkflowData();
    // Reset review completed state when workflow status changes
    setReviewCompleted(false);
  }, [memberId, token, workflowStatus, fetchWorkflowData]);

  const _fetchMeetings = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `${API_URL}/governance/meetings?meetingType=board&status=scheduled`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch {
      // Error is ignored, no further action needed
    }
  };

  const handleKYMSubmit = async (kymData: KYM) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/member-workflow/${memberId}/kyc`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kymData),
      });

      if (response.ok) {
        setShowKYMForm(false);
        fetchWorkflowData();
        onStatusChange();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save KYM');
      }
    } catch {
      alert('Error saving KYM');
    }
  };

  const handleReview = async () => {
    if (!token) return;

    // If complete_review, just mark as completed in frontend (no backend call)
    if (reviewAction === 'complete_review') {
      setReviewCompleted(true);
      setShowReviewModal(false);
      setRemarks('');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/member-workflow/${memberId}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: reviewAction, remarks }),
      });

      if (response.ok) {
        setShowReviewModal(false);
        setRemarks('');
        setReviewCompleted(false);
        fetchWorkflowData();
        onStatusChange();
        // Trigger badge refresh event for immediate sidebar update
        window.dispatchEvent(new Event('refreshBadges'));
      } else {
        const error = await response.json();
        const errorMessage = error.message
          ? `${error.error || 'Failed to review KYM'}\n\n${error.message}`
          : error.error || 'Failed to review KYM';
        alert(errorMessage);
      }
    } catch {
      alert('Error reviewing KYM');
    }
  };

  const handleSendToBOD = async () => {
    if (!token) {
      return;
    }
    try {
      // Send without meetingId - backend will find next upcoming meeting
      const response = await fetch(`${API_URL}/member-workflow/${memberId}/send-to-bod`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body - backend will find upcoming meeting
      });

      if (response.ok) {
        setShowBODModal(false);
        setMeetingId('');
        fetchWorkflowData();
        onStatusChange();
        // Trigger badge refresh event for immediate sidebar update
        window.dispatchEvent(new Event('refreshBadges'));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send to BOD');
      }
    } catch {
      alert('Error sending to BOD');
    }
  };

  const currentStepIndex = WORKFLOW_STEPS.findIndex((step) => step.key === workflowStatus);

  return (
    <div className="space-y-6">
      {/* Workflow Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Member Workflow Status</h2>

        {/* Workflow Steps */}
        <div className="flex items-start justify-between mb-6">
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = step.key === workflowStatus;
            const isCompleted = currentStepIndex > index;
            const isRejected = workflowStatus === 'rejected' && step.key === 'rejected';

            // Find history item for this step to get date
            const historyItem = history.find((h) => h.toStatus === step.key);
            let stepDate = historyItem
              ? new Date(historyItem.createdAt).toLocaleDateString()
              : null;

            // If step is 'application' and no history, use member creation date
            if (step.key === 'application' && !stepDate && createdAt) {
              stepDate = new Date(createdAt).toLocaleDateString();
            }

            return (
              <div key={step.key} className="flex flex-col items-center flex-1 relative group">
                {/* Tooltip for Active Status */}
                {step.key === 'active' && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-center">
                    Full Membership: Can perform transactions (Savings/Loan)
                  </div>
                )}

                {/* Step Circle and Lines Container - Fixed height for alignment */}
                <div
                  className="relative flex items-center justify-center w-full mb-8"
                  style={{ height: '2.5rem' }}
                >
                  {/* Line Before */}
                  <div
                    className={`h-1 flex-1 absolute left-0 ${
                      index === 0
                        ? 'invisible'
                        : isCompleted || isActive
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                    }`}
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  />

                  {/* Step Circle */}
                  <div
                    className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-semibold z-10 relative transition-all duration-300 ${
                      isActive
                        ? `bg-${step.color}-600 text-white ring-4 ring-${step.color}-100 scale-110`
                        : isCompleted
                          ? `bg-green-500 text-white`
                          : isRejected
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isRejected ? (
                      <svg
                        className="w-6 h-6"
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
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Current Stage Badge */}
                  {isActive && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-max z-20 mt-2">
                      <div
                        className={`px-3 py-1 text-xs font-bold text-${step.color}-700 bg-${step.color}-50 rounded-full border border-${step.color}-200 shadow-sm flex items-center space-x-1`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full bg-${step.color}-500 animate-pulse`}
                        ></span>
                        <span>Current Stage</span>
                      </div>
                      <div
                        className={`mx-auto w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-${step.color}-50 absolute -top-1.5 left-1/2 transform -translate-x-1/2`}
                      ></div>
                    </div>
                  )}

                  {/* Line After */}
                  <div
                    className={`h-1 flex-1 absolute right-0 ${
                      index === WORKFLOW_STEPS.length - 1
                        ? 'invisible'
                        : isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                    }`}
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>

                {/* Label and Date - Fixed height container */}
                <div className="flex flex-col items-center w-full min-h-[3rem]">
                  <p
                    className={`text-xs text-center font-medium px-1 ${isActive ? 'text-gray-900 font-bold' : 'text-gray-500'}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 min-h-[1rem]">
                    {stepDate || '\u00A0'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Share Amount Display for Under Review */}
        {workflowStatus === 'under_review' && kym && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Application Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kym.initialShareAmount !== undefined && kym.initialShareAmount !== null && (
                <div>
                  <p className="text-xs text-blue-700">Share Amount Requested</p>
                  <p className="text-lg font-bold text-blue-900">
                    Rs. {Number(kym.initialShareAmount).toLocaleString()}
                  </p>
                </div>
              )}
              {kym.initialSavingsAmount !== undefined && kym.initialSavingsAmount !== null && (
                <div>
                  <p className="text-xs text-blue-700">Savings Amount</p>
                  <p className="text-lg font-bold text-blue-900">
                    Rs. {Number(kym.initialSavingsAmount).toLocaleString()}
                  </p>
                </div>
              )}
              {kym.initialOtherAmount !== undefined && kym.initialOtherAmount !== null && (
                <div>
                  <p className="text-xs text-blue-700">Entry Fee</p>
                  <p className="text-lg font-bold text-blue-900">
                    Rs. {Number(kym.initialOtherAmount).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {workflowStatus === 'application' && (
            <button
              onClick={() => {
                setReviewAction('review');
                setShowReviewModal(true);
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Review KYM
            </button>
          )}
          {workflowStatus === 'under_review' && !reviewCompleted && (
            <button
              onClick={() => {
                setReviewAction('complete_review');
                setShowReviewModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Complete Review
            </button>
          )}
          {workflowStatus === 'under_review' && reviewCompleted && (
            <>
              <button
                onClick={() => {
                  setReviewAction('approve');
                  setShowReviewModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setReviewAction('reject');
                  setShowReviewModal(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}
          {/* Removed "Send to BOD Meeting" button - now automatic after approval */}
        </div>
      </div>

      {/* KYM Information Display */}
      {kym && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">KYM Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="text-lg font-medium text-gray-900">
                {kym.dateOfBirth ? new Date(kym.dateOfBirth).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nationality</p>
              <p className="text-lg font-medium text-gray-900">{kym.nationality || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Occupation</p>
              <p className="text-lg font-medium text-gray-900">{kym.occupation || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Income</p>
              <p className="text-lg font-medium text-gray-900">
                {kym.monthlyIncome ? `$${Number(kym.monthlyIncome).toFixed(2)}` : '-'}
              </p>
            </div>
            {kym.remarks && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Remarks</p>
                <p className="text-lg font-medium text-gray-900">{kym.remarks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow History Removed - Moved inside Status Card */}

      {/* KYM Form Modal - Simplified for now, can be expanded */}
      {showKYMForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">KYM Form</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please fill in all required KYM information. This is a simplified form - you can
              expand it with all fields.
            </p>
            <button
              onClick={() => {
                // For now, just submit minimal data - you can expand this with a full form
                handleKYMSubmit({
                  dateOfBirth: new Date().toISOString(),
                  nationality: 'Nepali',
                  occupation: 'Business',
                });
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Submit KYM (Demo)
            </button>
            <button
              onClick={() => setShowKYMForm(false)}
              className="ml-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {reviewAction === 'approve'
                ? 'Approve'
                : reviewAction === 'reject'
                  ? 'Reject'
                  : reviewAction === 'complete_review'
                    ? 'Complete Review'
                    : 'Review'}{' '}
              KYM
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Enter remarks..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleReview}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  reviewAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : reviewAction === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : reviewAction === 'complete_review'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {reviewAction === 'approve'
                  ? 'Approve'
                  : reviewAction === 'reject'
                    ? 'Reject'
                    : reviewAction === 'complete_review'
                      ? 'Complete Review'
                      : 'Mark as Reviewed'}
              </button>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setRemarks('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOD Modal */}
      {showBODModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Send Agenda to Upcoming Meeting
            </h2>
            {workflowStatus === 'approved' && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  This member will be added to the agenda of the next upcoming board meeting.
                </p>
                {meetings.length > 0 && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>Next Meeting:</strong> {meetings[0]?.title} -{' '}
                      {meetings[0]?.scheduledDate
                        ? new Date(meetings[0].scheduledDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleSendToBOD}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Send Agenda to Upcoming Meeting
              </button>
              <button
                onClick={() => {
                  setShowBODModal(false);
                  setMeetingId('');
                  setRemarks('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
