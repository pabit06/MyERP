'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { MemberWorkflow } from '@/features/members';
import Link from 'next/link';
import { removeDuplication } from '../../../lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Member {
  id: string;
  memberNumber: string;
  memberType?: 'INDIVIDUAL' | 'INSTITUTION';
  firstName?: string;
  middleName?: string;
  lastName?: string;
  institutionName?: string;
  fullName?: string;
  fullNameNepali?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  workflowStatus?: string;
  createdAt: string;
  savingAccounts?: any[];
  loanApplications?: any[];
  shareLedger?: {
    totalShares: number;
    totalValue: number;
  };
}

interface KYM {
  // Personal Details
  dateOfBirth?: string | Date;
  dateOfBirthBS?: string;
  gender?: string;
  nationality?: string;
  citizenshipNumber?: string;
  citizenshipIssuingOffice?: string;
  citizenshipIssuingDistrict?: string;

  // Family Details
  grandfatherName?: string;
  fatherName?: string;
  motherName?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseSurname?: string;
  familyType?: string;

  // Occupation Details
  occupation?: string;
  occupationSpecify?: string;
  panNo?: string;
  spouseOccupation?: string;
  spouseOccupationSpecify?: string;
  isHighRankingPositionHolder?: boolean;
  pepName?: string;
  pepRelationship?: string;
  pepPosition?: string;

  // Residential Details
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

  // Cooperative Membership
  membershipObjective?: string;
  isMemberOfAnotherCooperative?: boolean;
  isFamilyMemberOfAnotherCooperative?: boolean;
  isAnotherFamilyMemberInThisInstitution?: boolean;
  dualMembershipPurpose?: string;
  familyDualMembershipPurpose?: string;
  otherCooperativeMemberships?: Array<{
    institutionName: string;
    institutionAddress: string;
    membershipNo: string;
    sn: number;
  }>;
  familyMemberCooperativeMemberships?: Array<{
    nameSurnameRelationship: string;
    institutionNameAddress: string;
    membershipNo: string;
    sn: number;
  }>;
  familyMemberInThisInstitution?: Array<{
    nameSurnameRelationship: string;
    membershipNo: string;
    sn: number;
  }>;

  // Income Source Details
  annualFamilyIncome?: string;
  otherEarningFamilyMembers?: Array<{
    nameSurnameRelationship: string;
    occupation: string;
    monthlyIncome: number;
    sn: number;
  }>;
  incomeSourceDetails?: Array<{
    source: string;
    amount: number;
    sn: number;
  }>;

  // Financial Transaction Details
  initialShareAmount?: number;
  initialSavingsAmount?: number;
  initialOtherAmount?: number;
  initialOtherSpecify?: string;
  estimatedTransactionsPerYear?: number;
  estimatedAnnualDeposit?: number;
  estimatedLoanAmount?: number;
  additionalRemarks?: string;

  // Self-Declaration
  declarationChangeAgreement?: boolean;
  declarationTruthfulness?: boolean;
  declarationDate?: string | Date;

  // Recommendation
  recommender1Name?: string;
  recommender1MembershipNo?: string;
  recommender2Name?: string;
  recommender2MembershipNo?: string;
}

export default function MemberDetailPage() {
  const params = useParams();
  const { token } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [kym, setKym] = useState<KYM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id && token) {
      fetchMember();
    }
  }, [params.id, token]);

  const fetchMember = async () => {
    setIsLoading(true);
    try {
      const [memberResponse, kycResponse] = await Promise.all([
        fetch(`${API_URL}/members/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/member-workflow/${params.id}/kyc`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (memberResponse.ok) {
        const data = await memberResponse.json();
        setMember(data.member);
      } else {
        setError('Member not found');
      }

      if (kycResponse.ok) {
        const kymData = await kycResponse.json();
        setKym(kymData.kyc || kymData); // Handle both response formats
      } else {
        // Try alternative endpoint
        try {
          const altKycResponse = await fetch(`${API_URL}/members/${params.id}/kym`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (altKycResponse.ok) {
            const altKymData = await altKycResponse.json();
            setKym(altKymData);
          }
        } catch {
          // Ignore if this endpoint also fails
        }
      }
    } catch {
      setError('Error loading member');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !member) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Member not found'}
          </div>
          <Link href="/members" className="text-indigo-600 hover:text-indigo-800">
            ← Back to Members
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/members"
              className="text-indigo-600 hover:text-indigo-800 text-sm mb-2 inline-block"
            >
              ← Back to Members
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {removeDuplication(
                member.memberType === 'INSTITUTION'
                  ? member.institutionName ||
                      member.fullName ||
                      member.firstName ||
                      'Unknown Member'
                  : member.fullName ||
                      `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                      'Unknown Member'
              )}
            </h1>
            {member.fullNameNepali && (
              <p
                className="text-xl text-gray-600 mt-1"
                style={{ fontFamily: 'Arial Unicode MS, Noto Sans Devanagari, sans-serif' }}
              >
                {member.fullNameNepali}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {member.memberNumber ? `Member #${member.memberNumber}` : 'Member Number: Pending'}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              member.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {member.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Member Workflow */}
        {member.workflowStatus && (
          <MemberWorkflow
            memberId={member.id}
            workflowStatus={member.workflowStatus}
            onStatusChange={fetchMember}
            createdAt={member.createdAt}
          />
        )}

        {/* Member Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Member Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Member Number</p>
              <p className="text-lg font-medium text-gray-900">
                {member.memberNumber || (
                  <span className="text-gray-400 italic">
                    Pending (will be generated after approval)
                  </span>
                )}
              </p>
            </div>
            {member.memberType === 'INSTITUTION' ? (
              <div>
                <p className="text-sm text-gray-500">Institution Name</p>
                <p className="text-lg font-medium text-gray-900">
                  {member.institutionName || member.firstName || '-'}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-500">First Name</p>
                  <p className="text-lg font-medium text-gray-900">{member.firstName || '-'}</p>
                </div>
                {member.middleName && (
                  <div>
                    <p className="text-sm text-gray-500">Middle Name</p>
                    <p className="text-lg font-medium text-gray-900">{member.middleName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Last Name</p>
                  <p className="text-lg font-medium text-gray-900">{member.lastName || '-'}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm text-gray-500">Full Name (English)</p>
              <p className="text-lg font-medium text-gray-900">
                {removeDuplication(
                  member.memberType === 'INSTITUTION'
                    ? member.institutionName || member.fullName || member.firstName || '-'
                    : member.fullName ||
                        `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                        '-'
                )}
              </p>
            </div>
            {member.fullNameNepali && (
              <div>
                <p className="text-sm text-gray-500">Full Name (Nepali)</p>
                <p
                  className="text-lg font-medium text-gray-900"
                  style={{ fontFamily: 'Arial Unicode MS, Noto Sans Devanagari, sans-serif' }}
                >
                  {member.fullNameNepali}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-900">
                {member.email || kym?.emailId || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-lg font-medium text-gray-900">
                {member.phone || kym?.contactNo || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* KYM Information - Comprehensive Display */}
        {!kym && member.workflowStatus !== 'application' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-700">
              KYM information is not yet available. Please complete the KYM form first.
            </p>
          </div>
        )}
        {kym && (
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Complete KYM Information</h2>

            {/* Personal Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">1. Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kym.dateOfBirth && (
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth (AD)</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(kym.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {kym.dateOfBirthBS && (
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth (BS)</p>
                    <p className="text-base font-medium text-gray-900">{kym.dateOfBirthBS}</p>
                  </div>
                )}
                {kym.gender && (
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="text-base font-medium text-gray-900 capitalize">{kym.gender}</p>
                  </div>
                )}
                {kym.citizenshipNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Citizenship Number</p>
                    <p className="text-base font-medium text-gray-900">{kym.citizenshipNumber}</p>
                  </div>
                )}
                {kym.citizenshipIssuingOffice && (
                  <div>
                    <p className="text-sm text-gray-500">Citizenship Issuing Office</p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.citizenshipIssuingOffice}
                    </p>
                  </div>
                )}
                {kym.citizenshipIssuingDistrict && (
                  <div>
                    <p className="text-sm text-gray-500">Citizenship Issuing District</p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.citizenshipIssuingDistrict}
                    </p>
                  </div>
                )}
                {kym.nationality && (
                  <div>
                    <p className="text-sm text-gray-500">Nationality</p>
                    <p className="text-base font-medium text-gray-900">{kym.nationality}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Family Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">2. Family Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kym.motherName && (
                  <div>
                    <p className="text-sm text-gray-500">Mother's Name</p>
                    <p className="text-base font-medium text-gray-900">{kym.motherName}</p>
                  </div>
                )}
                {kym.fatherName && (
                  <div>
                    <p className="text-sm text-gray-500">Father's Name</p>
                    <p className="text-base font-medium text-gray-900">{kym.fatherName}</p>
                  </div>
                )}
                {kym.grandfatherName && (
                  <div>
                    <p className="text-sm text-gray-500">Grandfather's Name</p>
                    <p className="text-base font-medium text-gray-900">{kym.grandfatherName}</p>
                  </div>
                )}
                {kym.maritalStatus && (
                  <div>
                    <p className="text-sm text-gray-500">Marital Status</p>
                    <p className="text-base font-medium text-gray-900 capitalize">
                      {kym.maritalStatus}
                    </p>
                  </div>
                )}
                {kym.spouseName && (
                  <div>
                    <p className="text-sm text-gray-500">Spouse Name</p>
                    <p className="text-base font-medium text-gray-900">{kym.spouseName}</p>
                  </div>
                )}
                {kym.spouseSurname && (
                  <div>
                    <p className="text-sm text-gray-500">Spouse Surname</p>
                    <p className="text-base font-medium text-gray-900">{kym.spouseSurname}</p>
                  </div>
                )}
                {kym.familyType && (
                  <div>
                    <p className="text-sm text-gray-500">Family Type</p>
                    <p className="text-base font-medium text-gray-900">{kym.familyType}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Occupation Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Occupation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kym.occupation && (
                  <div>
                    <p className="text-sm text-gray-500">Occupation</p>
                    <p className="text-base font-medium text-gray-900">{kym.occupation}</p>
                  </div>
                )}
                {kym.occupationSpecify && (
                  <div>
                    <p className="text-sm text-gray-500">Occupation Details</p>
                    <p className="text-base font-medium text-gray-900">{kym.occupationSpecify}</p>
                  </div>
                )}
                {kym.panNo && (
                  <div>
                    <p className="text-sm text-gray-500">PAN Number</p>
                    <p className="text-base font-medium text-gray-900">{kym.panNo}</p>
                  </div>
                )}
                {kym.spouseOccupation && (
                  <div>
                    <p className="text-sm text-gray-500">Spouse Occupation</p>
                    <p className="text-base font-medium text-gray-900">{kym.spouseOccupation}</p>
                  </div>
                )}
                {kym.spouseOccupationSpecify && (
                  <div>
                    <p className="text-sm text-gray-500">Spouse Occupation Details</p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.spouseOccupationSpecify}
                    </p>
                  </div>
                )}
                {kym.isHighRankingPositionHolder && (
                  <div>
                    <p className="text-sm text-gray-500">High Ranking Position Holder</p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.isHighRankingPositionHolder ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
                {kym.isHighRankingPositionHolder && kym.pepName && (
                  <div>
                    <p className="text-sm text-gray-500">PEP Name</p>
                    <p className="text-base font-medium text-gray-900">{kym.pepName}</p>
                  </div>
                )}
                {kym.isHighRankingPositionHolder && kym.pepRelationship && (
                  <div>
                    <p className="text-sm text-gray-500">PEP Relationship</p>
                    <p className="text-base font-medium text-gray-900">{kym.pepRelationship}</p>
                  </div>
                )}
                {kym.isHighRankingPositionHolder && kym.pepPosition && (
                  <div>
                    <p className="text-sm text-gray-500">PEP Position</p>
                    <p className="text-base font-medium text-gray-900">{kym.pepPosition}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Residential Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">4. Residential Details</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-2">Permanent Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kym.permanentProvince && (
                      <div>
                        <p className="text-sm text-gray-500">Province</p>
                        <p className="text-base font-medium text-gray-900">
                          {kym.permanentProvince}
                        </p>
                      </div>
                    )}
                    {kym.permanentMunicipality && (
                      <div>
                        <p className="text-sm text-gray-500">Municipality</p>
                        <p className="text-base font-medium text-gray-900">
                          {kym.permanentMunicipality}
                        </p>
                      </div>
                    )}
                    {kym.permanentWard && (
                      <div>
                        <p className="text-sm text-gray-500">Ward</p>
                        <p className="text-base font-medium text-gray-900">{kym.permanentWard}</p>
                      </div>
                    )}
                    {kym.permanentVillageTole && (
                      <div>
                        <p className="text-sm text-gray-500">Village/Tole</p>
                        <p className="text-base font-medium text-gray-900">
                          {kym.permanentVillageTole}
                        </p>
                      </div>
                    )}
                    {kym.permanentHouseNo && (
                      <div>
                        <p className="text-sm text-gray-500">House No.</p>
                        <p className="text-base font-medium text-gray-900">
                          {kym.permanentHouseNo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {(kym.temporaryProvince || kym.temporaryMunicipality || kym.temporaryWard) && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">Temporary Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kym.temporaryProvince && (
                        <div>
                          <p className="text-sm text-gray-500">Province</p>
                          <p className="text-base font-medium text-gray-900">
                            {kym.temporaryProvince}
                          </p>
                        </div>
                      )}
                      {kym.temporaryMunicipality && (
                        <div>
                          <p className="text-sm text-gray-500">Municipality</p>
                          <p className="text-base font-medium text-gray-900">
                            {kym.temporaryMunicipality}
                          </p>
                        </div>
                      )}
                      {kym.temporaryWard && (
                        <div>
                          <p className="text-sm text-gray-500">Ward</p>
                          <p className="text-base font-medium text-gray-900">{kym.temporaryWard}</p>
                        </div>
                      )}
                      {kym.temporaryVillageTole && (
                        <div>
                          <p className="text-sm text-gray-500">Village/Tole</p>
                          <p className="text-base font-medium text-gray-900">
                            {kym.temporaryVillageTole}
                          </p>
                        </div>
                      )}
                      {kym.temporaryHouseNo && (
                        <div>
                          <p className="text-sm text-gray-500">House No.</p>
                          <p className="text-base font-medium text-gray-900">
                            {kym.temporaryHouseNo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="text-base font-medium text-gray-900">{kym.contactNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email ID</p>
                    <p className="text-base font-medium text-gray-900">{kym.emailId || '-'}</p>
                  </div>
                  {kym.residenceType && (
                    <div>
                      <p className="text-sm text-gray-500">Residence Type</p>
                      <p className="text-base font-medium text-gray-900">{kym.residenceType}</p>
                    </div>
                  )}
                  {kym.residenceDuration && (
                    <div>
                      <p className="text-sm text-gray-500">Duration of Stay</p>
                      <p className="text-base font-medium text-gray-900">{kym.residenceDuration}</p>
                    </div>
                  )}
                  {kym.voterIdCardNo && (
                    <div>
                      <p className="text-sm text-gray-500">Voter ID Card No.</p>
                      <p className="text-base font-medium text-gray-900">{kym.voterIdCardNo}</p>
                    </div>
                  )}
                  {kym.pollingStation && (
                    <div>
                      <p className="text-sm text-gray-500">Polling Station</p>
                      <p className="text-base font-medium text-gray-900">{kym.pollingStation}</p>
                    </div>
                  )}
                  {kym.passportNo && (
                    <div>
                      <p className="text-sm text-gray-500">Passport No.</p>
                      <p className="text-base font-medium text-gray-900">{kym.passportNo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cooperative Membership */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                5. Cooperative Membership
              </h3>
              <div className="space-y-4">
                {kym.membershipObjective && (
                  <div>
                    <p className="text-sm text-gray-500">Objective of Membership</p>
                    <p className="text-base font-medium text-gray-900">{kym.membershipObjective}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Member of Another Cooperative</p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.isMemberOfAnotherCooperative ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {kym.isMemberOfAnotherCooperative &&
                    kym.otherCooperativeMemberships &&
                    kym.otherCooperativeMemberships.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-2">Other Cooperative Memberships</p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  S.N.
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Institution Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Address
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Membership No.
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {kym.otherCooperativeMemberships.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.sn}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.institutionName}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.institutionAddress}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.membershipNo}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  {kym.dualMembershipPurpose && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Purpose of Dual/Multiple Memberships</p>
                      <p className="text-base font-medium text-gray-900">
                        {kym.dualMembershipPurpose}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Family Member of Another Cooperative</p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.isFamilyMemberOfAnotherCooperative ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {kym.isFamilyMemberOfAnotherCooperative &&
                    kym.familyMemberCooperativeMemberships &&
                    kym.familyMemberCooperativeMemberships.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-2">
                          Family Member Cooperative Memberships
                        </p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  S.N.
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Name, Surname, Relationship
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Institution Name & Address
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Membership No.
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {kym.familyMemberCooperativeMemberships.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.sn}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.nameSurnameRelationship}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.institutionNameAddress}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.membershipNo}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  {kym.familyDualMembershipPurpose && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">
                        Purpose of Family Member Dual/Multiple Memberships
                      </p>
                      <p className="text-base font-medium text-gray-900">
                        {kym.familyDualMembershipPurpose}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">
                      Another Family Member in This Institution
                    </p>
                    <p className="text-base font-medium text-gray-900">
                      {kym.isAnotherFamilyMemberInThisInstitution ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {kym.isAnotherFamilyMemberInThisInstitution &&
                    kym.familyMemberInThisInstitution &&
                    kym.familyMemberInThisInstitution.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-2">
                          Family Members in This Institution
                        </p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  S.N.
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Name, Surname, Relationship
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                  Membership No.
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {kym.familyMemberInThisInstitution.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.sn}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.nameSurnameRelationship}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {item.membershipNo}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Income Source Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">6. Income Source Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kym.annualFamilyIncome && (
                  <div>
                    <p className="text-sm text-gray-500">Annual Family Income</p>
                    <p className="text-base font-medium text-gray-900">{kym.annualFamilyIncome}</p>
                  </div>
                )}
                {kym.otherEarningFamilyMembers && kym.otherEarningFamilyMembers.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Other Earning Family Members</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              S.N.
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Name, Surname, Relationship
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Occupation
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Monthly Income
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {kym.otherEarningFamilyMembers.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.sn}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.nameSurnameRelationship}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.occupation}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                Rs. {item.monthlyIncome?.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {kym.incomeSourceDetails && kym.incomeSourceDetails.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Income Source Details</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              S.N.
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Source
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {kym.incomeSourceDetails.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.sn}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.source}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                Rs. {item.amount?.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Transaction Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                7. Financial Transaction Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kym.initialShareAmount !== undefined && kym.initialShareAmount !== null && (
                  <div>
                    <p className="text-sm text-gray-500">Initial Share Amount</p>
                    <p className="text-base font-medium text-gray-900">
                      Rs. {kym.initialShareAmount.toLocaleString()}
                    </p>
                  </div>
                )}
                {kym.initialSavingsAmount !== undefined && kym.initialSavingsAmount !== null && (
                  <div>
                    <p className="text-sm text-gray-500">Initial Savings Amount</p>
                    <p className="text-base font-medium text-gray-900">
                      Rs. {kym.initialSavingsAmount.toLocaleString()}
                    </p>
                  </div>
                )}
                {kym.initialOtherAmount !== undefined && kym.initialOtherAmount !== null && (
                  <div>
                    <p className="text-sm text-gray-500">Initial Other Amount</p>
                    <p className="text-base font-medium text-gray-900">
                      Rs. {kym.initialOtherAmount.toLocaleString()}
                    </p>
                  </div>
                )}
                {kym.initialOtherSpecify && (
                  <div>
                    <p className="text-sm text-gray-500">Other Amount Specify</p>
                    <p className="text-base font-medium text-gray-900">{kym.initialOtherSpecify}</p>
                  </div>
                )}
                {kym.estimatedTransactionsPerYear !== undefined &&
                  kym.estimatedTransactionsPerYear !== null && (
                    <div>
                      <p className="text-sm text-gray-500">Estimated Transactions Per Year</p>
                      <p className="text-base font-medium text-gray-900">
                        {kym.estimatedTransactionsPerYear}
                      </p>
                    </div>
                  )}
                {kym.estimatedAnnualDeposit !== undefined &&
                  kym.estimatedAnnualDeposit !== null && (
                    <div>
                      <p className="text-sm text-gray-500">Estimated Annual Deposit</p>
                      <p className="text-base font-medium text-gray-900">
                        Rs. {kym.estimatedAnnualDeposit.toLocaleString()}
                      </p>
                    </div>
                  )}
                {kym.estimatedLoanAmount !== undefined && kym.estimatedLoanAmount !== null && (
                  <div>
                    <p className="text-sm text-gray-500">Estimated Loan Amount</p>
                    <p className="text-base font-medium text-gray-900">
                      Rs. {kym.estimatedLoanAmount.toLocaleString()}
                    </p>
                  </div>
                )}
                {kym.additionalRemarks && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Additional Remarks</p>
                    <p className="text-base font-medium text-gray-900">{kym.additionalRemarks}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Self-Declaration */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">8. Self-Declaration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Change Agreement</p>
                  <p className="text-base font-medium text-gray-900">
                    {kym.declarationChangeAgreement ? 'Agreed' : 'Not Agreed'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Truthfulness Declaration</p>
                  <p className="text-base font-medium text-gray-900">
                    {kym.declarationTruthfulness ? 'Agreed' : 'Not Agreed'}
                  </p>
                </div>
                {kym.declarationDate && (
                  <div>
                    <p className="text-sm text-gray-500">Declaration Date</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(kym.declarationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendation */}
            {(kym.recommender1Name || kym.recommender2Name) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">9. Recommendation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kym.recommender1Name && (
                    <div>
                      <p className="text-sm text-gray-500">Recommender 1 Name</p>
                      <p className="text-base font-medium text-gray-900">{kym.recommender1Name}</p>
                    </div>
                  )}
                  {kym.recommender1MembershipNo && (
                    <div>
                      <p className="text-sm text-gray-500">Recommender 1 Membership No.</p>
                      <p className="text-base font-medium text-gray-900">
                        {kym.recommender1MembershipNo}
                      </p>
                    </div>
                  )}
                  {kym.recommender2Name && (
                    <div>
                      <p className="text-sm text-gray-500">Recommender 2 Name</p>
                      <p className="text-base font-medium text-gray-900">{kym.recommender2Name}</p>
                    </div>
                  )}
                  {kym.recommender2MembershipNo && (
                    <div>
                      <p className="text-sm text-gray-500">Recommender 2 Membership No.</p>
                      <p className="text-base font-medium text-gray-900">
                        {kym.recommender2MembershipNo}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Savings Accounts */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Savings Accounts</h3>
            <p className="text-3xl font-bold text-indigo-600">
              {member.savingAccounts?.length || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Active accounts</p>
          </div>

          {/* Loan Applications */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loan Applications</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {member.loanApplications?.length || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Total applications</p>
          </div>

          {/* Shares */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shares</h3>
            <p className="text-3xl font-bold text-green-600">
              {member.shareLedger?.totalShares || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Value: ${member.shareLedger?.totalValue?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        {/* Savings Accounts List */}
        {member.savingAccounts && member.savingAccounts.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Savings Accounts</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Account #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {member.savingAccounts.map((account: any) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {account.accountNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.product?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(account.balance).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            account.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loan Applications List */}
        {member.loanApplications && member.loanApplications.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Loan Applications</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Application #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {member.loanApplications.map((application: any) => (
                    <tr key={application.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {application.applicationNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.product?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(application.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            application.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : application.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {application.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
