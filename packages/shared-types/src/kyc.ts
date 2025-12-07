import { z } from 'zod';
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  FAMILY_TYPE_OPTIONS,
  OCCUPATION_OPTIONS,
  ANNUAL_INCOME_RANGES,
} from './kyc-options';

const OtherCooperativeMembershipSchema = z.object({
  institutionName: z.string().min(1, 'Institution name is required'),
  institutionAddress: z.string().min(1, 'Institution address is required'),
  membershipNo: z.string().min(1, 'Membership number is required'),
  sn: z.number(),
});

const FamilyMemberCooperativeMembershipSchema = z.object({
  nameSurnameRelationship: z.string().min(1, 'Details are required'),
  institutionNameAddress: z.string().min(1, 'Institution details are required'),
  membershipNo: z.string().min(1, 'Membership number is required'),
  sn: z.number(),
});

const FamilyMemberInThisInstitutionSchema = z.object({
  nameSurname: z.string().min(1, 'Name and surname are required'),
  membershipNo: z.string().min(1, 'Membership number is required'),
  sn: z.number(),
});

const OtherEarningFamilyMemberSchema = z.object({
  relationship: z.string().min(1, 'Relationship is required'),
  occupation: z.string().min(1, 'Occupation is required'),
  occupationSpecify: z.string().optional(),
});

const IncomeSourceDetailSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  amount: z.number().positive('Amount must be positive'),
  sn: z.number(),
});

export const KymFormSchema = z
  .object({
    // Personal Details
    firstName: z.string().min(1, 'First name is required'),
    surname: z.string().min(1, 'Surname is required'),
    dateOfBirth: z.coerce.date({ required_error: 'Date of birth is required' }).refine(
      (date) => {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        const dayDiff = today.getDate() - date.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        return actualAge >= 16;
      },
      {
        message: 'You must be at least 16 years old to become a cooperative member',
      }
    ),
    citizenshipNumber: z.string().min(1, 'Citizenship number is required'),
    citizenshipIssuingOffice: z.string().min(1, 'Issuing office is required'),
    citizenshipIssuingDistrict: z.string().min(1, 'Issuing district is required'),
    gender: z.enum(GENDER_OPTIONS.map((o) => o.value) as [string, ...string[]]),

    // Family Details
    motherName: z.string().min(1, "Mother's name is required"),
    fatherName: z.string().min(1, "Father's name is required"),
    maritalStatus: z.enum(MARITAL_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]]),
    spouseName: z.string().optional(),
    spouseSurname: z.string().optional(),
    familyType: z.enum(FAMILY_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]]),

    // Occupation Details
    occupation: z.enum(OCCUPATION_OPTIONS.map((o) => o.value) as [string, ...string[]]),
    occupationSpecify: z.string().optional(),
    panNo: z.string().optional(),
    spouseOccupation: z
      .enum(OCCUPATION_OPTIONS.map((o) => o.value) as [string, ...string[]])
      .optional(),
    spouseOccupationSpecify: z.string().optional(),
    otherEarningFamilyMembers: z.array(OtherEarningFamilyMemberSchema).optional(),
    isHighRankingPositionHolder: z.boolean(),
    pepName: z.string().optional(),
    pepRelationship: z.string().optional(),
    pepPosition: z.string().optional(),

    // Residential Details
    permanentProvince: z.string().min(1, 'Province is required'),
    permanentMunicipality: z.string().min(1, 'Municipality is required'),
    permanentWard: z.string().min(1, 'Ward is required'),
    permanentVillageTole: z.string().min(1, 'Village/Tole is required'),
    permanentHouseNo: z.string().optional(),
    contactNo: z.string().min(1, 'Contact number is required'),
    emailId: z.string().email().optional().or(z.literal('')),
    temporaryProvince: z.string().optional(),
    temporaryMunicipality: z.string().optional(),
    temporaryWard: z.string().optional(),
    temporaryVillageTole: z.string().optional(),
    temporaryHouseNo: z.string().optional(),
    residenceType: z.enum(['PERMANENT', 'TEMPORARY']),
    voterIdCardNo: z.string().optional(),
    pollingStation: z.string().optional(),
    residenceDuration: z.string().min(1, 'Duration of stay is required'),
    passportNo: z.string().optional(),

    // Cooperative Membership
    membershipObjective: z.string().min(1, 'Objective is required'),
    isMemberOfAnotherCooperative: z.boolean(),
    otherCooperativeMemberships: z.array(OtherCooperativeMembershipSchema).optional(),
    dualMembershipPurpose: z.string().optional(),
    isFamilyMemberOfAnotherCooperative: z.boolean(),
    familyMemberCooperativeMemberships: z.array(FamilyMemberCooperativeMembershipSchema).optional(),
    familyDualMembershipPurpose: z.string().optional(),
    isAnotherFamilyMemberInThisInstitution: z.boolean(),
    familyMemberInThisInstitution: z.array(FamilyMemberInThisInstitutionSchema).optional(),

    // Income Source Details
    annualFamilyIncome: z.enum(ANNUAL_INCOME_RANGES.map((o) => o.value) as [string, ...string[]]),
    incomeSourceDetails: z.array(IncomeSourceDetailSchema).optional(),

    // Financial Transaction Details
    initialShareAmount: z
      .number()
      .positive('Share amount is required and must be greater than 0')
      .refine((val) => val % 100 === 0, {
        message: 'Share amount must be divisible by 100 (per kitta = Rs. 100)',
      }),
    initialSavingsAmount: z.number().optional(),
    initialOtherAmount: z.number().optional(),
    initialOtherSpecify: z.string().optional(),
    estimatedTransactionsPerYear: z.number().int().positive().optional(),
    estimatedAnnualDeposit: z.number().positive().optional(),
    estimatedLoanAmount: z.number().positive().optional(),
    additionalRemarks: z.string().optional(),

    // Self-Declaration
    declarationChangeAgreement: z
      .boolean()
      .refine((val) => val === true, { message: 'You must agree to the terms' }),
    declarationTruthfulness: z
      .boolean()
      .refine((val) => val === true, { message: 'You must agree to the terms' }),
    declarationDate: z.coerce.date(),

    // Attached Documents - handled separately as file uploads

    // Recommendation
    recommender1Name: z.string().optional(),
    recommender1MembershipNo: z.string().optional(),
    recommender2Name: z.string().optional(),
    recommender2MembershipNo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Age validation: Must be at least 16 years old
    if (data.dateOfBirth) {
      const today = new Date();
      const age = today.getFullYear() - data.dateOfBirth.getFullYear();
      const monthDiff = today.getMonth() - data.dateOfBirth.getMonth();
      const dayDiff = today.getDate() - data.dateOfBirth.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dateOfBirth'],
          message: 'You must be at least 16 years old to become a cooperative member',
        });
      }
    }

    if (data.maritalStatus === 'MARRIED' && !data.spouseName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['spouseName'],
        message: 'Spouse name is required for married individuals',
      });
    }
    if (data.isHighRankingPositionHolder && !data.pepName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pepName'],
        message: 'PEP name is required',
      });
    }
    if (
      data.annualFamilyIncome !== 'UP_TO_4_LAKH' &&
      (!data.incomeSourceDetails || data.incomeSourceDetails.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['incomeSourceDetails'],
        message: 'Income source details are required for income over 4 lakh',
      });
    }
    if (
      data.isMemberOfAnotherCooperative &&
      (!data.otherCooperativeMemberships || data.otherCooperativeMemberships.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherCooperativeMemberships'],
        message: 'Details of other cooperative memberships are required',
      });
    }
    if (
      data.isFamilyMemberOfAnotherCooperative &&
      (!data.familyMemberCooperativeMemberships ||
        data.familyMemberCooperativeMemberships.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['familyMemberCooperativeMemberships'],
        message: 'Details of family member cooperative memberships are required',
      });
    }
    if (
      data.isAnotherFamilyMemberInThisInstitution &&
      (!data.familyMemberInThisInstitution || data.familyMemberInThisInstitution.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['familyMemberInThisInstitution'],
        message: 'Details of family members in this institution are required',
      });
    }
  });

export type KymFormData = z.infer<typeof KymFormSchema>;
