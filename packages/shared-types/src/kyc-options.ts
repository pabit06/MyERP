// Shared constants for KYM (Know Your Member) form dropdowns
// These options are mapped to risk factors for automated assessment

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OccupationOption {
  label: string;
  value: string;
  risk: RiskLevel;
}

export const OCCUPATION_OPTIONS: OccupationOption[] = [
  // Low Risk Occupations
  { label: 'Agriculture', value: 'AGRICULTURE', risk: 'LOW' },
  { label: 'Government Service', value: 'GOVT_SERVICE', risk: 'LOW' },
  { label: 'Student', value: 'STUDENT', risk: 'LOW' },
  { label: 'Teacher', value: 'TEACHER', risk: 'LOW' },
  { label: 'Healthcare Professional', value: 'HEALTHCARE', risk: 'LOW' },
  { label: 'Engineer', value: 'ENGINEER', risk: 'LOW' },
  { label: 'Accountant', value: 'ACCOUNTANT', risk: 'LOW' },
  { label: 'Retired', value: 'RETIRED', risk: 'LOW' },
  { label: 'Homemaker', value: 'HOMEMAKER', risk: 'LOW' },

  // Medium Risk Occupations
  { label: 'Private Service/Job', value: 'PRIVATE_SERVICE', risk: 'MEDIUM' },
  { label: 'Small Business', value: 'SMALL_BUSINESS', risk: 'MEDIUM' },
  { label: 'Freelancer', value: 'FREELANCER', risk: 'MEDIUM' },
  { label: 'Consultant', value: 'CONSULTANT', risk: 'MEDIUM' },

  // High Risk Occupations (as per Section 31(5))
  { label: 'Real Estate Business', value: 'REAL_ESTATE', risk: 'HIGH' },
  { label: 'Precious Metals/Stones (Gold/Silver)', value: 'PRECIOUS_METALS', risk: 'HIGH' },
  { label: 'Manpower Agency', value: 'MANPOWER', risk: 'HIGH' },
  { label: 'Cash-Intensive Business', value: 'CASH_INTENSIVE', risk: 'HIGH' },
  { label: 'Jewelry Business', value: 'JEWELRY', risk: 'HIGH' },
  { label: 'Money Exchange', value: 'MONEY_EXCHANGE', risk: 'HIGH' },
  { label: 'Gaming/Gambling', value: 'GAMING', risk: 'HIGH' },

  // Foreign Employment
  { label: 'Foreign Employment', value: 'FOREIGN_EMPLOYMENT', risk: 'MEDIUM' },

  // Other
  { label: 'Other', value: 'OTHER', risk: 'MEDIUM' },
];

export const GENDER_OPTIONS = [
  { label: 'Female', value: 'FEMALE' },
  { label: 'Male', value: 'MALE' },
  { label: 'Third', value: 'THIRD' },
];

export const MARITAL_STATUS_OPTIONS = [
  { label: 'Married', value: 'MARRIED' },
  { label: 'Unmarried', value: 'UNMARRIED' },
  { label: 'Single', value: 'SINGLE' },
];

export const FAMILY_TYPE_OPTIONS = [
  { label: 'Joint and one kitchen', value: 'JOINT_ONE_KITCHEN' },
  { label: 'Joint but separate kitchen', value: 'JOINT_SEPARATE_KITCHEN' },
  { label: 'Nuclear', value: 'NUCLEAR' },
];

export const ANNUAL_INCOME_RANGES = [
  { label: 'Up to Rs. 4 lakh', value: 'UP_TO_4_LAKH' },
  { label: 'More than Rs. 4 lakh to Rs. 10 lakh', value: '4_TO_10_LAKH' },
  { label: 'More than Rs. 10 lakh to Rs. 25 lakh', value: '10_TO_25_LAKH' },
  { label: 'More than Rs. 25 lakh to Rs. 50 lakh', value: '25_TO_50_LAKH' },
  { label: 'More than Rs. 50 lakh', value: 'ABOVE_50_LAKH' },
];

export const INCOME_SOURCE_TYPES = [
  { label: 'Farming', value: 'FARMING' },
  { label: 'Business', value: 'BUSINESS' },
  { label: 'Domestic Employment', value: 'DOMESTIC_EMPLOYMENT' },
  { label: 'Foreign Employment', value: 'FOREIGN_EMPLOYMENT' },
  { label: 'Other', value: 'OTHER' },
];

export const RELATIONSHIP_OPTIONS = [
  { label: 'Father', value: 'FATHER' },
  { label: 'Mother', value: 'MOTHER' },
  { label: 'Spouse', value: 'SPOUSE' },
  { label: 'Son', value: 'SON' },
  { label: 'Daughter', value: 'DAUGHTER' },
  { label: 'Brother', value: 'BROTHER' },
  { label: 'Sister', value: 'SISTER' },
  { label: 'Other', value: 'OTHER' },
];

export const RESIDENCE_TYPE_OPTIONS = [
  { label: 'Permanent', value: 'PERMANENT' },
  { label: 'Temporary', value: 'TEMPORARY' },
];

// Helper function to get occupation risk level
export function getOccupationRisk(occupationValue: string): RiskLevel {
  const occupation = OCCUPATION_OPTIONS.find((opt) => opt.value === occupationValue);
  return occupation?.risk || 'MEDIUM';
}
