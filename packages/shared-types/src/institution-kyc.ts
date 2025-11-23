import { z } from 'zod';

// Schema for Board of Directors, CEO, Account Operators identification
const IdentificationDetailSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().optional(),
  identificationDetails: z.string().min(1, 'Identification details are required'),
});

const BoardOfDirectorsSchema = z.array(IdentificationDetailSchema);
const AccountOperatorsSchema = z.array(IdentificationDetailSchema);

export const InstitutionKymFormSchema = z
  .object({
    // Institution Details
    name: z.string().min(1, 'Institution name is required'),
    registrationNo: z.string().min(1, 'Registration number is required'),
    registrationDate: z.date({ required_error: 'Registration date is required' }),
    registeringOffice: z.string().min(1, 'Registering office is required'),
    renewalDate: z.date().optional(),
    headOfficeAddress: z.string().min(1, 'Head office address is required'),
    mainObjective: z.string().min(1, 'Main objective is required'),
    natureOfBusiness: z.string().min(1, 'Nature of business is required'),
    workingArea: z.string().min(1, 'Working area is required'),
    numberOfBranches: z.number().int().nonnegative().optional(),
    branchLocations: z.string().optional(),

    // Documents (file paths will be handled separately)
    hasBylawsConstitution: z.boolean(),
    hasOfficialLetter: z.boolean(),
    hasFinancialStatement: z.boolean(),
    hasTaxClearance: z.boolean(),
    hasTaxFilingDetails: z.boolean(),

    // Financial Information
    estimatedAnnualTransaction: z
      .number()
      .positive('Estimated annual transaction must be positive')
      .optional(),
    panVatRegistrationNo: z.string().optional(),

    // Financial Transaction Details (Application Payment)
    // Required at application time, separate from KYC risk assessment
    initialShareAmount: z
      .number()
      .positive('Share amount is required and must be greater than 0')
      .refine((val) => val % 100 === 0, {
        message: 'Share amount must be divisible by 100 (per kitta = Rs. 100)',
      }),
    initialSavingsAmount: z.number().optional(),
    initialOtherAmount: z.number().optional(),
    initialOtherSpecify: z.string().optional(),

    // Board of Directors, CEO, Account Operators
    boardOfDirectors: BoardOfDirectorsSchema.min(1, 'At least one board member is required'),
    chiefExecutive: IdentificationDetailSchema,
    accountOperators: AccountOperatorsSchema.min(1, 'At least one account operator is required'),

    // Board Decision
    boardDecisionDate: z.date().optional(),
    hasBoardDecision: z.boolean(),

    // Other Details
    otherDetails: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // If no bylaws/constitution, official letter is required
    if (!data.hasBylawsConstitution && !data.hasOfficialLetter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hasOfficialLetter'],
        message: 'Either bylaws/constitution or official letter is required',
      });
    }

    // Financial statement is required
    if (!data.hasFinancialStatement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hasFinancialStatement'],
        message: 'Financial statement is required',
      });
    }

    // Tax clearance or tax filing details is required
    if (!data.hasTaxClearance && !data.hasTaxFilingDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hasTaxFilingDetails'],
        message: 'Either tax clearance certificate or tax filing details is required',
      });
    }
  });

export type InstitutionKymFormData = z.infer<typeof InstitutionKymFormSchema>;
