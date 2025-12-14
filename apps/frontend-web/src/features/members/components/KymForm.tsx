'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KymFormSchema, KymFormData } from '@myerp/shared-types';
import {
  OCCUPATION_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  FAMILY_TYPE_OPTIONS,
  ANNUAL_INCOME_RANGES,
  INCOME_SOURCE_TYPES,
  RELATIONSHIP_OPTIONS,
  RESIDENCE_TYPE_OPTIONS,
  type OccupationOption,
} from '@myerp/shared-types';
import {
  Button,
  Input,
  Checkbox,
  NepaliDatePicker,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/components/shared';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface KymFormProps {
  defaultValues?: Partial<KymFormData>;
  mode: 'onboarding' | 'update';
  onSubmit: (data: KymFormData) => Promise<void>;
  onCancel?: () => void;
}

export const KymForm: React.FC<KymFormProps> = ({ defaultValues, mode, onSubmit, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = mode === 'onboarding' ? 9 : 8;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<KymFormData>({
    resolver: zodResolver(KymFormSchema),
    defaultValues: {
      ...defaultValues,
      declarationDate: defaultValues?.declarationDate || new Date(),
      otherEarningFamilyMembers: defaultValues?.otherEarningFamilyMembers || [],
      otherCooperativeMemberships: defaultValues?.otherCooperativeMemberships || [],
      familyMemberCooperativeMemberships: defaultValues?.familyMemberCooperativeMemberships || [],
      familyMemberInThisInstitution: defaultValues?.familyMemberInThisInstitution || [],
      incomeSourceDetails: defaultValues?.incomeSourceDetails || [],
    },
  });

  const occupation = watch('occupation');
  const spouseOccupation = watch('spouseOccupation');
  const maritalStatus = watch('maritalStatus');
  const isHighRankingPositionHolder = watch('isHighRankingPositionHolder');
  const annualFamilyIncome = watch('annualFamilyIncome');
  const isMemberOfAnotherCooperative = watch('isMemberOfAnotherCooperative');
  const isFamilyMemberOfAnotherCooperative = watch('isFamilyMemberOfAnotherCooperative');
  const isAnotherFamilyMemberInThisInstitution = watch('isAnotherFamilyMemberInThisInstitution');
  const [hasTemporaryAddress, setHasTemporaryAddress] = useState(
    !!(
      defaultValues?.temporaryProvince ||
      defaultValues?.temporaryMunicipality ||
      defaultValues?.temporaryWard
    )
  );

  const {
    fields: otherEarningFields,
    append: appendOtherEarning,
    remove: removeOtherEarning,
  } = useFieldArray({
    control,
    name: 'otherEarningFamilyMembers',
  });

  const {
    fields: otherCoopFields,
    append: appendOtherCoop,
    remove: removeOtherCoop,
  } = useFieldArray({
    control,
    name: 'otherCooperativeMemberships',
  });

  const {
    fields: familyCoopFields,
    append: appendFamilyCoop,
    remove: removeFamilyCoop,
  } = useFieldArray({
    control,
    name: 'familyMemberCooperativeMemberships',
  });

  const {
    fields: familyInThisInstFields,
    append: appendFamilyInThisInst,
    remove: removeFamilyInThisInst,
  } = useFieldArray({
    control,
    name: 'familyMemberInThisInstitution',
  });

  const {
    fields: incomeSourceFields,
    append: appendIncomeSource,
    remove: removeIncomeSource,
  } = useFieldArray({
    control,
    name: 'incomeSourceDetails',
  });

  const handleFormSubmit = async (data: KymFormData) => {
    // Convert date strings to Date objects or ISO strings for backend
    const formattedData: any = { ...data };

    // Handle dateOfBirth
    if (formattedData.dateOfBirth) {
      if (typeof formattedData.dateOfBirth === 'string') {
        formattedData.dateOfBirth = new Date(formattedData.dateOfBirth);
      }
      // Convert to ISO string for JSON serialization
      if (formattedData.dateOfBirth instanceof Date) {
        formattedData.dateOfBirth = formattedData.dateOfBirth.toISOString();
      }
    }

    // Handle declarationDate
    if (!formattedData.declarationDate) {
      formattedData.declarationDate = new Date();
    }
    if (typeof formattedData.declarationDate === 'string') {
      formattedData.declarationDate = new Date(formattedData.declarationDate);
    }
    // Convert to ISO string for JSON serialization
    if (formattedData.declarationDate instanceof Date) {
      formattedData.declarationDate = formattedData.declarationDate.toISOString();
    }

    console.log('Form submitted with data:', formattedData);
    console.log('Form errors before submission:', errors);

    try {
      await onSubmit(formattedData as KymFormData);
    } catch (error) {
      console.error('Form submission error:', error);
      // Error is handled by parent component
      // Re-throw to let parent handle it
      throw error;
    }
  };

  const getStepFields = (step: number): (keyof KymFormData)[] => {
    switch (step) {
      case 1:
        return [
          'firstName',
          'surname',
          'dateOfBirth',
          'citizenshipNumber',
          'citizenshipIssuingOffice',
          'citizenshipIssuingDistrict',
          'gender',
        ];
      case 2:
        return [
          'motherName',
          'fatherName',
          'maritalStatus',
          'spouseName',
          'spouseSurname',
          'familyType',
        ];
      case 3:
        return [
          'occupation',
          'occupationSpecify',
          'panNo',
          'spouseOccupation',
          'spouseOccupationSpecify',
          'isHighRankingPositionHolder',
          'pepName',
          'pepRelationship',
          'pepPosition',
        ];
      case 4:
        return [
          'permanentProvince',
          'permanentMunicipality',
          'permanentWard',
          'permanentVillageTole',
          'permanentHouseNo',
          'contactNo',
          'emailId',
          'temporaryProvince',
          'temporaryMunicipality',
          'temporaryWard',
          'temporaryVillageTole',
          'temporaryHouseNo',
          'residenceType',
          'voterIdCardNo',
          'pollingStation',
          'residenceDuration',
          'passportNo',
        ];
      case 5:
        return [
          'membershipObjective',
          'isMemberOfAnotherCooperative',
          'isFamilyMemberOfAnotherCooperative',
          'isAnotherFamilyMemberInThisInstitution',
          'otherCooperativeMemberships',
          'familyMemberCooperativeMemberships',
          'dualMembershipPurpose',
          'familyDualMembershipPurpose',
        ];
      case 6:
        return ['annualFamilyIncome'];
      case 7:
        return [
          'initialShareAmount',
          'initialSavingsAmount',
          'initialOtherAmount',
          'initialOtherSpecify',
          'estimatedTransactionsPerYear',
          'estimatedAnnualDeposit',
          'estimatedLoanAmount',
          'additionalRemarks',
        ];
      case 8:
        return ['declarationChangeAgreement', 'declarationTruthfulness', 'declarationDate'];
      case 9:
        return [
          'recommender1Name',
          'recommender1MembershipNo',
          'recommender2Name',
          'recommender2MembershipNo',
        ];
      default:
        return [];
    }
  };

  const handleNext = async () => {
    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const stepTitles = [
    '',
    '1. Personal Details',
    '2. Family Details',
    '3. Occupation Details',
    '4. Residential Details',
    '5. Cooperative Membership',
    '6. Income Source Details',
    '7. Financial Transaction Details',
    '8. Self-Declaration',
    '9. Recommendation',
  ];

  const getStepForField = (fieldName: keyof KymFormData): number => {
    for (let step = 1; step <= totalSteps; step++) {
      const stepFields = getStepFields(step);
      if (stepFields.includes(fieldName)) {
        return step;
      }
    }
    return 1;
  };

  // Helper to get all error keys including nested ones
  const getAllErrorKeys = (errorObj: any, prefix = ''): string[] => {
    const keys: string[] = [];
    for (const key in errorObj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (errorObj[key] && typeof errorObj[key] === 'object' && !errorObj[key].message) {
        // It's a nested object, recurse
        keys.push(...getAllErrorKeys(errorObj[key], fullKey));
      } else if (errorObj[key]?.message || errorObj[key]) {
        // It's an error
        keys.push(fullKey);
      }
    }
    return keys;
  };

  const onSubmitForm = handleSubmit(handleFormSubmit, (errors) => {
    // If validation fails, find the first error and navigate to that step
    if (errors && Object.keys(errors).length > 0) {
      // Get all error keys including nested array errors
      const allErrorKeys = getAllErrorKeys(errors);
      const firstErrorKey = allErrorKeys[0];

      if (firstErrorKey) {
        // Extract base field name (e.g., "familyMemberCooperativeMemberships" from "familyMemberCooperativeMemberships.0.nameSurnameRelationship")
        const baseField = firstErrorKey.split('.')[0] as keyof KymFormData;
        const errorStep = getStepForField(baseField);
        setCurrentStep(errorStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Log errors for debugging
      console.log('Validation errors:', errors);
      console.log('All error keys:', allErrorKeys);
    }
  });

  return (
    <form onSubmit={onSubmitForm} className="space-y-6">
      {/* Progress Indicator with Clickable Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </h3>
          <span className="text-sm text-gray-500">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>

        {/* Clickable Step Indicators */}
        <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
          {stepTitles.slice(1, totalSteps + 1).map((title, index) => {
            const stepNum = index + 1;
            const isActive = currentStep === stepNum;
            const hasError = Object.keys(errors).some((field) => {
              const stepFields = getStepFields(stepNum);
              return stepFields.includes(field as keyof KymFormData);
            });

            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => {
                  setCurrentStep(stepNum);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : hasError
                      ? 'bg-red-100 text-red-700 border-2 border-red-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={title}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive
                      ? 'bg-white text-blue-600'
                      : hasError
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {stepNum}
                </div>
                <span className="text-xs mt-1 text-center line-clamp-2">
                  {title.split('. ')[1] || title}
                </span>
                {hasError && !isActive && (
                  <span className="text-xs text-red-600 mt-1">⚠ Error</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Show validation errors summary if there are errors */}
      {Object.keys(errors).length > 0 &&
        (() => {
          // Flatten all errors including nested ones
          const flattenedErrors: Array<{ key: string; error: any }> = [];
          const flattenErrors = (errorObj: any, prefix = '') => {
            for (const key in errorObj) {
              const fullKey = prefix ? `${prefix}.${key}` : key;
              if (errorObj[key] && typeof errorObj[key] === 'object' && !errorObj[key].message) {
                // It's a nested object, recurse
                flattenErrors(errorObj[key], fullKey);
              } else if (errorObj[key]?.message || errorObj[key]) {
                // It's an error
                flattenedErrors.push({ key: fullKey, error: errorObj[key] });
              }
            }
          };
          flattenErrors(errors);

          return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700 font-medium mb-2">
                Please fix the following errors before submitting:
              </p>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {flattenedErrors.slice(0, 10).map(({ key, error }) => {
                  const baseField = key.split('.')[0] as keyof KymFormData;
                  const errorStep = getStepForField(baseField);

                  // Get user-friendly field name
                  const getFieldLabel = (fieldName: string): string => {
                    const fieldLabels: Record<string, string> = {
                      familyMemberCooperativeMemberships: 'Family Member Cooperative Memberships',
                      otherCooperativeMemberships: 'Other Cooperative Memberships',
                      membershipObjective: 'Membership Objective',
                      isMemberOfAnotherCooperative: 'Member of Another Cooperative',
                      isFamilyMemberOfAnotherCooperative: 'Family Member of Another Cooperative',
                      firstName: 'First Name',
                      surname: 'Surname',
                      dateOfBirth: 'Date of Birth',
                      citizenshipNumber: 'Citizenship Number',
                      motherName: "Mother's Name",
                      fatherName: "Father's Name",
                      maritalStatus: 'Marital Status',
                      spouseName: 'Spouse Name',
                      occupation: 'Occupation',
                      panNo: 'PAN Number',
                      permanentProvince: 'Permanent Province',
                      permanentMunicipality: 'Permanent Municipality',
                      contactNo: 'Contact Number',
                      emailId: 'Email ID',
                      annualFamilyIncome: 'Annual Family Income',
                      initialShareAmount: 'Initial Share Amount',
                      declarationChangeAgreement: 'Declaration Change Agreement',
                      declarationTruthfulness: 'Declaration Truthfulness',
                      recommender1Name: 'Recommender 1 Name',
                      recommender2Name: 'Recommender 2 Name',
                    };

                    // Handle array field errors
                    if (fieldName.includes('[') && fieldName.includes(']')) {
                      const baseField = fieldName.split('[')[0];
                      const index = fieldName.match(/\[(\d+)\]/)?.[1];
                      const subField = fieldName.split('.').pop();
                      const baseLabel = fieldLabels[baseField] || baseField;
                      const subFieldLabels: Record<string, string> = {
                        nameSurnameRelationship: 'Name, Surname, Relationship',
                        institutionNameAddress: 'Institution Name & Address',
                        institutionName: 'Institution Name',
                        institutionAddress: 'Institution Address',
                        membershipNo: 'Membership Number',
                      };
                      const subLabel = subFieldLabels[subField || ''] || subField;
                      return `${baseLabel} (Item ${index ? Number(index) + 1 : ''} - ${subLabel})`;
                    }

                    return fieldLabels[fieldName] || fieldName;
                  };

                  const fieldLabel = getFieldLabel(key);

                  return (
                    <li key={key} className="flex items-center justify-between">
                      <span>
                        <strong>Step {errorStep}</strong> - {fieldLabel}:{' '}
                        {error?.message || 'Invalid value'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(errorStep);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="ml-4 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Go to Step {errorStep}
                      </button>
                    </li>
                  );
                })}
                {flattenedErrors.length > 10 && (
                  <li>... and {flattenedErrors.length - 10} more error(s)</li>
                )}
              </ul>
            </div>
          );
        })()}

      <div className="space-y-6">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[1]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Name: "RAM", Surname: "SHRESTHA", Citizenship No:
                  "12345/067/068", Issuing Office: "District Administration Office", District:
                  "Kathmandu"
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">1. Name *</label>
                  <Input {...register('firstName')} placeholder="e.g., RAM" />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Surname *</label>
                  <Input {...register('surname')} placeholder="e.g., SHRESTHA" />
                  {errors.surname && (
                    <p className="text-red-500 text-sm mt-1">{errors.surname.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    2. Date of Birth *{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      (Minimum age: 16 years)
                    </span>
                  </label>
                  <Controller
                    name="dateOfBirth"
                    control={control}
                    render={({ field }) => (
                      <NepaliDatePicker
                        value={
                          field.value
                            ? typeof field.value === 'string'
                              ? field.value
                              : field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            : ''
                        }
                        onChange={(dateString) => {
                          field.onChange(dateString ? new Date(dateString) : undefined);
                        }}
                        label=""
                        required
                      />
                    )}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                  )}
                  {!errors.dateOfBirth && (
                    <p className="text-xs text-gray-500 mt-1">
                      You must be at least 16 years old to become a cooperative member
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    3. Citizenship Certificate No. *
                  </label>
                  <Input {...register('citizenshipNumber')} placeholder="e.g., 12345/067/068" />
                  {errors.citizenshipNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.citizenshipNumber.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">4. Issuing Office *</label>
                  <Input
                    {...register('citizenshipIssuingOffice')}
                    placeholder="e.g., District Administration Office"
                  />
                  {errors.citizenshipIssuingOffice && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.citizenshipIssuingOffice.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Issuing District *</label>
                  <Input
                    {...register('citizenshipIssuingDistrict')}
                    placeholder="e.g., Kathmandu"
                  />
                  {errors.citizenshipIssuingDistrict && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.citizenshipIssuingDistrict.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">5. Gender *</label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((option: { label: string; value: string }) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Family Details */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[2]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Mother's Name: "SITA SHRESTHA", Father's Name: "HARI
                  SHRESTHA", Marital Status: "Married", Spouse Name: "GITA SHRESTHA"
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">6. Mother's Name *</label>
                  <Input {...register('motherName')} placeholder="e.g., SITA SHRESTHA" />
                  {errors.motherName && (
                    <p className="text-red-500 text-sm mt-1">{errors.motherName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">7. Father's Name *</label>
                  <Input {...register('fatherName')} placeholder="e.g., HARI SHRESTHA" />
                  {errors.fatherName && (
                    <p className="text-red-500 text-sm mt-1">{errors.fatherName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">8. Marital Status *</label>
                  <Controller
                    name="maritalStatus"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                        <SelectContent>
                          {MARITAL_STATUS_OPTIONS.map(
                            (option: { label: string; value: string }) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.maritalStatus && (
                    <p className="text-red-500 text-sm mt-1">{errors.maritalStatus.message}</p>
                  )}
                </div>
                {maritalStatus === 'MARRIED' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        9. Husband or Wife's Name *
                      </label>
                      <Input {...register('spouseName')} placeholder="e.g., GITA" />
                      {errors.spouseName && (
                        <p className="text-red-500 text-sm mt-1">{errors.spouseName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Surname *</label>
                      <Input {...register('spouseSurname')} placeholder="e.g., SHRESTHA" />
                      {errors.spouseSurname && (
                        <p className="text-red-500 text-sm mt-1">{errors.spouseSurname.message}</p>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">10. Family Type *</label>
                  <Controller
                    name="familyType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select family type" />
                        </SelectTrigger>
                        <SelectContent>
                          {FAMILY_TYPE_OPTIONS.map((option: { label: string; value: string }) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.familyType && (
                    <p className="text-red-500 text-sm mt-1">{errors.familyType.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Occupation Details */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[3]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Occupation: "Government Service" or "Business", PAN:
                  "123456789", If Business: Specify "Grocery Store"
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    11. Own Main Occupation *
                  </label>
                  <Controller
                    name="occupation"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select occupation" />
                        </SelectTrigger>
                        <SelectContent>
                          {OCCUPATION_OPTIONS.map((option: OccupationOption) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.occupation && (
                    <p className="text-red-500 text-sm mt-1">{errors.occupation.message}</p>
                  )}
                </div>
                {[
                  'SMALL_BUSINESS',
                  'REAL_ESTATE',
                  'JEWELRY',
                  'CASH_INTENSIVE',
                  'MONEY_EXCHANGE',
                  'GAMING',
                  'PRECIOUS_METALS',
                  'MANPOWER',
                  'PRIVATE_SERVICE',
                  'FREELANCER',
                  'CONSULTANT',
                  'FOREIGN_EMPLOYMENT',
                  'OTHER',
                ].includes(occupation || '') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Specify Occupation</label>
                    <Input
                      {...register('occupationSpecify')}
                      placeholder="Specify your occupation"
                    />
                    {errors.occupationSpecify && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.occupationSpecify.message}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    12. Permanent Account Number (PAN)
                  </label>
                  <Input {...register('panNo')} placeholder="e.g., 123456789" />
                  {errors.panNo && (
                    <p className="text-red-500 text-sm mt-1">{errors.panNo.message}</p>
                  )}
                </div>
                {maritalStatus === 'MARRIED' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        13. Husband or Wife's Main Occupation
                      </label>
                      <Controller
                        name="spouseOccupation"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select occupation" />
                            </SelectTrigger>
                            <SelectContent>
                              {OCCUPATION_OPTIONS.map((option: OccupationOption) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.spouseOccupation && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.spouseOccupation.message}
                        </p>
                      )}
                    </div>
                    {[
                      'SMALL_BUSINESS',
                      'REAL_ESTATE',
                      'JEWELRY',
                      'CASH_INTENSIVE',
                      'MONEY_EXCHANGE',
                      'GAMING',
                      'PRECIOUS_METALS',
                      'MANPOWER',
                      'PRIVATE_SERVICE',
                      'FREELANCER',
                      'CONSULTANT',
                      'FOREIGN_EMPLOYMENT',
                      'OTHER',
                    ].includes(spouseOccupation || '') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Specify Spouse Occupation
                        </label>
                        <Input
                          {...register('spouseOccupationSpecify')}
                          placeholder="Specify spouse occupation"
                        />
                        {errors.spouseOccupationSpecify && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.spouseOccupationSpecify.message}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium">
                      14. Other main earning member in the family
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendOtherEarning({ relationship: '', occupation: '' })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Member
                    </Button>
                  </div>
                  {otherEarningFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded"
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          14.1 Relationship *
                        </label>
                        <Controller
                          name={`otherEarningFamilyMembers.${index}.relationship`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                {RELATIONSHIP_OPTIONS.map(
                                  (option: { label: string; value: string }) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.otherEarningFamilyMembers?.[index]?.relationship && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.otherEarningFamilyMembers[index]?.relationship?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">14.2 Occupation *</label>
                        <Controller
                          name={`otherEarningFamilyMembers.${index}.occupation`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select occupation" />
                              </SelectTrigger>
                              <SelectContent>
                                {OCCUPATION_OPTIONS.map((option: OccupationOption) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.otherEarningFamilyMembers?.[index]?.occupation && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.otherEarningFamilyMembers[index]?.occupation?.message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOtherEarning(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    15. Whether self or any family member holds a high-ranking position *
                  </label>
                  <Controller
                    name="isHighRankingPositionHolder"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            className="h-4 w-4"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            className="h-4 w-4"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    )}
                  />
                  {errors.isHighRankingPositionHolder && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.isHighRankingPositionHolder.message}
                    </p>
                  )}
                </div>
                {isHighRankingPositionHolder && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">16. (1) Name *</label>
                      <Input {...register('pepName')} />
                      {errors.pepName && (
                        <p className="text-red-500 text-sm mt-1">{errors.pepName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">(2) Relationship *</label>
                      <Input {...register('pepRelationship')} />
                      {errors.pepRelationship && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.pepRelationship.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        (3) Position or Public Role *
                      </label>
                      <Input {...register('pepPosition')} />
                      {errors.pepPosition && (
                        <p className="text-red-500 text-sm mt-1">{errors.pepPosition.message}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Residential Details */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[4]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Province: "Bagmati", Municipality: "Kathmandu
                  Metropolitan City", Ward: "5", Village/Tole: "Thamel", House No: "123", Contact:
                  "9841234567"
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">17. Permanent Address *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">(1) Province *</label>
                      <Input {...register('permanentProvince')} placeholder="e.g., Bagmati" />
                      {errors.permanentProvince && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.permanentProvince.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        (2) Municipality/Rural Municipality *
                      </label>
                      <Input
                        {...register('permanentMunicipality')}
                        placeholder="e.g., Kathmandu Metropolitan City"
                      />
                      {errors.permanentMunicipality && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.permanentMunicipality.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">(3) Ward *</label>
                      <Input {...register('permanentWard')} placeholder="e.g., 5" />
                      {errors.permanentWard && (
                        <p className="text-red-500 text-sm mt-1">{errors.permanentWard.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">(4) Village/Tole *</label>
                      <Input {...register('permanentVillageTole')} placeholder="e.g., Thamel" />
                      {errors.permanentVillageTole && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.permanentVillageTole.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">(5) House No.</label>
                      <Input {...register('permanentHouseNo')} placeholder="e.g., 123" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">(6) Contact No. *</label>
                      <Input {...register('contactNo')} placeholder="e.g., 9841234567" />
                      {errors.contactNo && (
                        <p className="text-red-500 text-sm mt-1">{errors.contactNo.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">(7) Email ID</label>
                      <Input
                        type="email"
                        {...register('emailId')}
                        placeholder="e.g., example@email.com"
                      />
                      {errors.emailId && (
                        <p className="text-red-500 text-sm mt-1">{errors.emailId.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="hasTemporaryAddress"
                      checked={hasTemporaryAddress}
                      onCheckedChange={(checked) => {
                        setHasTemporaryAddress(checked as boolean);
                        if (!checked) {
                          // Clear temporary address fields when unchecked
                          setValue('temporaryProvince', '');
                          setValue('temporaryMunicipality', '');
                          setValue('temporaryWard', '');
                          setValue('temporaryVillageTole', '');
                          setValue('temporaryHouseNo', '');
                        }
                      }}
                    />
                    <label
                      htmlFor="hasTemporaryAddress"
                      className="text-sm font-medium cursor-pointer"
                    >
                      18. I have a Temporary Address (different from permanent address)
                    </label>
                  </div>
                  {hasTemporaryAddress && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">(1) Province</label>
                        <Input {...register('temporaryProvince')} placeholder="e.g., Bagmati" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          (2) Municipality/Rural Municipality
                        </label>
                        <Input
                          {...register('temporaryMunicipality')}
                          placeholder="e.g., Kathmandu Metropolitan City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">(3) Ward</label>
                        <Input {...register('temporaryWard')} placeholder="e.g., 5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">(4) Village/Tole</label>
                        <Input {...register('temporaryVillageTole')} placeholder="e.g., Thamel" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">(5) House No.</label>
                        <Input {...register('temporaryHouseNo')} placeholder="e.g., 123" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      19. Residence within the institution's working area *
                    </label>
                    <Controller
                      name="residenceType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select residence type" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESIDENCE_TYPE_OPTIONS.map(
                              (option: { label: string; value: string }) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.residenceType && (
                      <p className="text-red-500 text-sm mt-1">{errors.residenceType.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">20. Voter ID Card No.</label>
                    <Input {...register('voterIdCardNo')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">21. Polling Station</label>
                    <Input {...register('pollingStation')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      22. Duration of stay in the institution's working area per year *
                    </label>
                    <Input {...register('residenceDuration')} placeholder="e.g., 12 months" />
                    {errors.residenceDuration && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.residenceDuration.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      23. Passport No. (if any)
                    </label>
                    <Input {...register('passportNo')} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Cooperative Membership */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[5]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Objective: "To save money and get loans", If member of
                  other cooperative: Institution Name: "ABC Cooperative", Membership No: "M001"
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    24. Objective of becoming a member of the institution *
                  </label>
                  <Input
                    {...register('membershipObjective')}
                    placeholder="e.g., To save money and get loans"
                  />
                  {errors.membershipObjective && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.membershipObjective.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    25. Whether also a member of another cooperative institution *
                  </label>
                  <Controller
                    name="isMemberOfAnotherCooperative"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            className="h-4 w-4"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            className="h-4 w-4"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    )}
                  />
                </div>
                {isMemberOfAnotherCooperative && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium">
                          26. Details of other cooperative memberships *
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendOtherCoop({
                              institutionName: '',
                              institutionAddress: '',
                              membershipNo: '',
                              sn: otherCoopFields.length + 1,
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Membership
                        </Button>
                      </div>
                      {otherCoopFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded"
                        >
                          <div>
                            <label className="block text-sm font-medium mb-1">S.N.</label>
                            <Input
                              type="number"
                              {...register(`otherCooperativeMemberships.${index}.sn`, {
                                valueAsNumber: true,
                              })}
                              value={index + 1}
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Name, Address of Institution *
                            </label>
                            <Input
                              {...register(`otherCooperativeMemberships.${index}.institutionName`)}
                              placeholder="Institution name"
                            />
                            {errors.otherCooperativeMemberships?.[index]?.institutionName && (
                              <p className="text-red-500 text-sm mt-1">
                                {
                                  errors.otherCooperativeMemberships[index]?.institutionName
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <Input
                              {...register(
                                `otherCooperativeMemberships.${index}.institutionAddress`
                              )}
                              placeholder="Institution address"
                            />
                            {errors.otherCooperativeMemberships?.[index]?.institutionAddress && (
                              <p className="text-red-500 text-sm mt-1">
                                {
                                  errors.otherCooperativeMemberships[index]?.institutionAddress
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Membership No. *
                            </label>
                            <div className="flex gap-2">
                              <Input
                                {...register(`otherCooperativeMemberships.${index}.membershipNo`)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeOtherCoop(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {errors.otherCooperativeMemberships?.[index]?.membershipNo && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.otherCooperativeMemberships[index]?.membershipNo?.message}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        29. Purpose of dual or multiple memberships
                      </label>
                      <Input {...register('dualMembershipPurpose')} />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    27. Whether any family member is a member of another cooperative institution *
                  </label>
                  <Controller
                    name="isFamilyMemberOfAnotherCooperative"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            className="h-4 w-4"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            className="h-4 w-4"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    )}
                  />
                </div>
                {isFamilyMemberOfAnotherCooperative && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium">
                          28. Details of family member cooperative memberships *
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            appendFamilyCoop({
                              nameSurnameRelationship: '',
                              institutionNameAddress: '',
                              membershipNo: '',
                              sn: familyCoopFields.length + 1,
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Membership
                        </Button>
                      </div>
                      {familyCoopFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded"
                        >
                          <div>
                            <label className="block text-sm font-medium mb-1">S.N.</label>
                            <Input
                              type="number"
                              {...register(`familyMemberCooperativeMemberships.${index}.sn`, {
                                valueAsNumber: true,
                              })}
                              value={index + 1}
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Name, Surname, Relationship *
                            </label>
                            <Input
                              {...register(
                                `familyMemberCooperativeMemberships.${index}.nameSurnameRelationship`
                              )}
                            />
                            {errors.familyMemberCooperativeMemberships?.[index]
                              ?.nameSurnameRelationship && (
                              <p className="text-red-500 text-sm mt-1">
                                {
                                  errors.familyMemberCooperativeMemberships[index]
                                    ?.nameSurnameRelationship?.message
                                }
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Name, Address of Institution *
                            </label>
                            <Input
                              {...register(
                                `familyMemberCooperativeMemberships.${index}.institutionNameAddress`
                              )}
                            />
                            {errors.familyMemberCooperativeMemberships?.[index]
                              ?.institutionNameAddress && (
                              <p className="text-red-500 text-sm mt-1">
                                {
                                  errors.familyMemberCooperativeMemberships[index]
                                    ?.institutionNameAddress?.message
                                }
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Membership No. *
                            </label>
                            <div className="flex gap-2">
                              <Input
                                {...register(
                                  `familyMemberCooperativeMemberships.${index}.membershipNo`
                                )}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeFamilyCoop(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {errors.familyMemberCooperativeMemberships?.[index]?.membershipNo && (
                              <p className="text-red-500 text-sm mt-1">
                                {
                                  errors.familyMemberCooperativeMemberships[index]?.membershipNo
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        30. Purpose of family member dual or multiple memberships
                      </label>
                      <Input {...register('familyDualMembershipPurpose')} />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    31. Whether another family member is also a member of this institution *
                  </label>
                  <Controller
                    name="isAnotherFamilyMemberInThisInstitution"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            className="h-4 w-4"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            className="h-4 w-4"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    )}
                  />
                </div>
                {isAnotherFamilyMemberInThisInstitution && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium">
                        32. Details of family members in this institution *
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendFamilyInThisInst({
                            nameSurname: '',
                            membershipNo: '',
                            sn: familyInThisInstFields.length + 1,
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Member
                      </Button>
                    </div>
                    {familyInThisInstFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-1">S.N.</label>
                          <Input
                            type="number"
                            {...register(`familyMemberInThisInstitution.${index}.sn`, {
                              valueAsNumber: true,
                            })}
                            value={index + 1}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Name, Surname *</label>
                          <Input
                            {...register(`familyMemberInThisInstitution.${index}.nameSurname`)}
                          />
                          {errors.familyMemberInThisInstitution?.[index]?.nameSurname && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.familyMemberInThisInstitution[index]?.nameSurname?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Membership No. *</label>
                          <div className="flex gap-2">
                            <Input
                              {...register(`familyMemberInThisInstitution.${index}.membershipNo`)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeFamilyInThisInst(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {errors.familyMemberInThisInstitution?.[index]?.membershipNo && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.familyMemberInThisInstitution[index]?.membershipNo?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Income Source Details */}
        {currentStep === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[6]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Annual Income: "More than Rs. 4 lakh to Rs. 10 lakh",
                  If income &gt; 4 lakh: Source: "Business", Amount: "500000"
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    33. Annual family income *
                  </label>
                  <Controller
                    name="annualFamilyIncome"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select income range" />
                        </SelectTrigger>
                        <SelectContent>
                          {ANNUAL_INCOME_RANGES.map((option: { label: string; value: string }) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.annualFamilyIncome && (
                    <p className="text-red-500 text-sm mt-1">{errors.annualFamilyIncome.message}</p>
                  )}
                </div>
                {annualFamilyIncome && annualFamilyIncome !== 'UP_TO_4_LAKH' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium">
                        34. Details of income and source for the last fiscal year *
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendIncomeSource({
                            source: '',
                            amount: 0,
                            sn: incomeSourceFields.length + 1,
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Source
                      </Button>
                    </div>
                    {incomeSourceFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-1">S.N.</label>
                          <Input
                            type="number"
                            {...register(`incomeSourceDetails.${index}.sn`, {
                              valueAsNumber: true,
                            })}
                            value={index + 1}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Source *</label>
                          <Controller
                            name={`incomeSourceDetails.${index}.source`}
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INCOME_SOURCE_TYPES.map(
                                    (option: { label: string; value: string }) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.incomeSourceDetails?.[index]?.source && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.incomeSourceDetails[index]?.source?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Amount (Rs.) *</label>
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`incomeSourceDetails.${index}.amount`, {
                              valueAsNumber: true,
                            })}
                          />
                          {errors.incomeSourceDetails?.[index]?.amount && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.incomeSourceDetails[index]?.amount?.message}
                            </p>
                          )}
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeIncomeSource(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Financial Transaction Details */}
        {currentStep === 7 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[7]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Share Amount: "10000" (must be multiple of 100, per
                  kitta = Rs. 100), Savings: "5000", Entry Fee (Other): "500", Specify: "Entry Fee
                  (Prabesh Shulka)", Transactions per year: "12", Annual deposit: "100000"
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    35. (1) Share Amount (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="100"
                    min="100"
                    required
                    {...register('initialShareAmount', { valueAsNumber: true })}
                    placeholder="e.g., 10000 (must be multiple of 100)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Per kitta = Rs. 100. Amount must be divisible by 100.
                  </p>
                  {errors.initialShareAmount && (
                    <p className="text-red-500 text-sm mt-1">{errors.initialShareAmount.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">(2) Savings Amount (Rs.)</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('initialSavingsAmount', { valueAsNumber: true })}
                    placeholder="e.g., 5000"
                  />
                  {errors.initialSavingsAmount && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.initialSavingsAmount.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    (3) Other Amount (Rs.) - Entry Fee
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('initialOtherAmount', { valueAsNumber: true })}
                    placeholder="e.g., 500"
                  />
                  {errors.initialOtherAmount && (
                    <p className="text-red-500 text-sm mt-1">{errors.initialOtherAmount.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Specify Other</label>
                  <Input
                    {...register('initialOtherSpecify')}
                    placeholder="e.g., Entry Fee (Prabesh Shulka)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    36. a. Number of transactions per year
                  </label>
                  <Input
                    type="number"
                    {...register('estimatedTransactionsPerYear', { valueAsNumber: true })}
                    placeholder="e.g., 12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    b. Estimated annual deposit amount (Rs.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('estimatedAnnualDeposit', { valueAsNumber: true })}
                    placeholder="e.g., 100000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    37. Estimated loan transaction amount (Rs.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('estimatedLoanAmount', { valueAsNumber: true })}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    38. Additional details or remarks
                  </label>
                  <Input {...register('additionalRemarks')} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 8: Self-Declaration */}
        {currentStep === 8 && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[8]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Please read and check both declaration statements. Both are
                  required to proceed.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Controller
                    name="declarationChangeAgreement"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="declarationChangeAgreement"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label htmlFor="declarationChangeAgreement" className="text-sm">
                    (1) If there is any change in the details I have submitted, I will submit it to
                    the institution within 35 days of such change. *
                  </label>
                </div>
                {errors.declarationChangeAgreement && (
                  <p className="text-red-500 text-sm">
                    {errors.declarationChangeAgreement.message}
                  </p>
                )}

                <div className="flex items-start space-x-2">
                  <Controller
                    name="declarationTruthfulness"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="declarationTruthfulness"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <label htmlFor="declarationTruthfulness" className="text-sm">
                    (2) All the details I have submitted above are true and correct. If found to be
                    false, I shall bear the consequences according to the law. *
                  </label>
                </div>
                {errors.declarationTruthfulness && (
                  <p className="text-red-500 text-sm">{errors.declarationTruthfulness.message}</p>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <Controller
                    name="declarationDate"
                    control={control}
                    render={({ field }) => (
                      <NepaliDatePicker
                        value={
                          field.value
                            ? typeof field.value === 'string'
                              ? field.value
                              : field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            : ''
                        }
                        onChange={(dateString) => {
                          field.onChange(dateString ? new Date(dateString) : new Date());
                        }}
                        label=""
                        required
                      />
                    )}
                  />
                  {errors.declarationDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.declarationDate.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 9: Recommendation (for onboarding mode) */}
        {currentStep === 9 && mode === 'onboarding' && (
          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[9]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Examples:</strong> Recommender 1 Name: "HARI PRASAD", Membership No:
                  "M001", Recommender 2 Name: "SITA DEVI", Membership No: "M002"
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Recommending Member 1 - Name
                  </label>
                  <Input {...register('recommender1Name')} placeholder="e.g., HARI PRASAD" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Recommending Member 1 - Membership No.
                  </label>
                  <Input {...register('recommender1MembershipNo')} placeholder="e.g., M001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Recommending Member 2 - Name
                  </label>
                  <Input {...register('recommender2Name')} placeholder="e.g., SITA DEVI" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Recommending Member 2 - Membership No.
                  </label>
                  <Input {...register('recommender2MembershipNo')} placeholder="e.g., M002" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        <div className="flex space-x-4">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
          )}
          {currentStep < totalSteps ? (
            <Button type="button" onClick={handleNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Submitting...'
                : mode === 'onboarding'
                  ? 'Submit for Review'
                  : 'Update KYM'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};
