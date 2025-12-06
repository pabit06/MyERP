/**
 * Backend-specific KYC validation schemas
 * These schemas use z.coerce to handle string-to-number/date conversions from request bodies
 * and transform empty strings to null for optional fields
 */

import { z } from 'zod';
import { KymFormSchema, InstitutionKymFormSchema } from '@myerp/shared-types';

/**
 * Preprocess data to convert empty strings to null and coerce types
 */
function preprocessKycData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(preprocessKycData);
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '') {
      result[key] = null;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = preprocessKycData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Backend schema for individual KYC that handles coercion from request body
 * Uses preprocessing to handle empty strings, then validates with the base schema
 * The base schema already has z.coerce.date() for dates, but we need to ensure
 * numeric fields are coerced. Since the base schema uses z.number(), we need
 * to preprocess numeric strings.
 */
export const BackendKymFormSchema = z.preprocess((data) => {
  const preprocessed = preprocessKycData(data);
  // Coerce numeric strings to numbers for fields that need it
  if (typeof preprocessed === 'object' && preprocessed !== null && !Array.isArray(preprocessed)) {
    const numericFields = [
      'initialShareAmount',
      'initialSavingsAmount',
      'initialOtherAmount',
      'estimatedTransactionsPerYear',
      'estimatedAnnualDeposit',
      'estimatedLoanAmount',
      'monthlyIncome',
    ];
    const result: Record<string, any> = { ...preprocessed };
    for (const field of numericFields) {
      if (field in result && typeof result[field] === 'string' && result[field] !== '') {
        const num = Number(result[field]);
        if (!isNaN(num)) {
          result[field] = num;
        }
      }
    }
    return result;
  }
  return preprocessed;
}, KymFormSchema);

/**
 * Backend schema for institution KYC that handles coercion from request body
 */
export const BackendInstitutionKymFormSchema = z.preprocess((data) => {
  const preprocessed = preprocessKycData(data);
  // Coerce numeric strings to numbers for fields that need it
  if (typeof preprocessed === 'object' && preprocessed !== null && !Array.isArray(preprocessed)) {
    const numericFields = [
      'initialShareAmount',
      'initialSavingsAmount',
      'initialOtherAmount',
      'estimatedAnnualTransaction',
      'numberOfBranches',
    ];
    const result: Record<string, any> = { ...preprocessed };
    for (const field of numericFields) {
      if (field in result && typeof result[field] === 'string' && result[field] !== '') {
        const num = Number(result[field]);
        if (!isNaN(num)) {
          result[field] = num;
        }
      }
    }
    return result;
  }
  return preprocessed;
}, InstitutionKymFormSchema);
