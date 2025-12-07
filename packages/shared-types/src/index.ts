// Shared types and interfaces across all applications
import { z } from 'zod';

export type ModuleName = 'cbs' | 'dms' | 'hrm' | 'governance' | 'inventory' | 'compliance';

// Export KYM (Know Your Member) types and schemas
export * from './kyc';
export * from './kyc-options';
export * from './institution-kyc';
export * from './api-responses';

// Export Zod validation schemas (DTOs)
export * from './zod-schemas';

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  enabledModules: ModuleName[];
}

export interface Cooperative {
  id: string;
  name: string;
  subdomain: string;
  enabledModules?: ModuleName[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cooperativeId: string;
  roleId?: string;
  isActive: boolean;
}

export interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  cooperativeId: string;
  isActive: boolean;
}

// Validation schemas
export const createMemberSchema = z
  .object({
    memberType: z.enum(['INDIVIDUAL', 'INSTITUTION']).default('INDIVIDUAL'),
    firstName: z.string().optional(), // Required for individuals
    lastName: z.string().optional(), // Required for individuals
    institutionName: z.string().optional(), // Required for institutions
    middleName: z.string().optional(),
    fullName: z.string().optional(),
    fullNameNepali: z.string().optional(),
    email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // For individuals, firstName and lastName are required
    if (data.memberType === 'INDIVIDUAL') {
      if (!data.firstName || data.firstName.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'First name is required for individuals',
          path: ['firstName'],
        });
      }
      if (!data.lastName || data.lastName.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Last name is required for individuals',
          path: ['lastName'],
        });
      }
    }
    // For institutions, institutionName is required
    if (data.memberType === 'INSTITUTION') {
      if (!data.institutionName || data.institutionName.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Institution name is required',
          path: ['institutionName'],
        });
      }
    }
  });

export const updateMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  middleName: z.string().optional().nullable(),
  fullName: z.string().optional(),
  fullNameNepali: z.string().optional().nullable(),
  email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateMemberStatusSchema = z.object({
  toStatus: z.string().min(1, 'New status is required'),
  remarks: z.string().optional(),
});
