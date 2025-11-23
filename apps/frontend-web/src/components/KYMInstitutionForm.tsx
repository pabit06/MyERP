'use client';

import React, { useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InstitutionKymFormSchema, InstitutionKymFormData } from '@myerp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface KYMInstitutionFormProps {
  memberId?: string;
  defaultValues?: Partial<InstitutionKymFormData>;
  mode: 'onboarding' | 'update';
  onSubmit: (data: InstitutionKymFormData) => Promise<void>;
  onCancel?: () => void;
}

export const KYMInstitutionForm: React.FC<KYMInstitutionFormProps> = ({
  memberId,
  defaultValues,
  mode,
  onSubmit,
  onCancel,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<InstitutionKymFormData>({
    resolver: zodResolver(InstitutionKymFormSchema),
    defaultValues: defaultValues || {
      boardOfDirectors: [{ name: '', identificationDetails: '' }],
      accountOperators: [{ name: '', identificationDetails: '' }],
      chiefExecutive: { name: '', identificationDetails: '' },
    },
  });

  const {
    fields: boardFields,
    append: appendBoard,
    remove: removeBoard,
  } = useFieldArray({
    control,
    name: 'boardOfDirectors',
  });

  const {
    fields: operatorFields,
    append: appendOperator,
    remove: removeOperator,
  } = useFieldArray({
    control,
    name: 'accountOperators',
  });

  const hasBylawsConstitution = watch('hasBylawsConstitution');
  const hasOfficialLetter = watch('hasOfficialLetter');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Accordion type="multiple" defaultValue={['institution-details']} className="w-full">
        {/* Institution Details */}
        <AccordionItem value="institution-details">
          <AccordionTrigger>
            <CardTitle>1. Institution Details</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input {...register('name')} />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Registration No. *</label>
                  <Input {...register('registrationNo')} />
                  {errors.registrationNo && (
                    <p className="text-red-500 text-sm">{errors.registrationNo.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Registration Date *</label>
                  <Controller
                    name="registrationDate"
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
                  {errors.registrationDate && (
                    <p className="text-red-500 text-sm">{errors.registrationDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Registering Office *</label>
                  <Input {...register('registeringOffice')} />
                  {errors.registeringOffice && (
                    <p className="text-red-500 text-sm">{errors.registeringOffice.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <Controller
                    name="renewalDate"
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
                      />
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Head Office Address *</label>
                  <Input {...register('headOfficeAddress')} />
                  {errors.headOfficeAddress && (
                    <p className="text-red-500 text-sm">{errors.headOfficeAddress.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Main Objective of the Institution *
                  </label>
                  <textarea
                    {...register('mainObjective')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                  {errors.mainObjective && (
                    <p className="text-red-500 text-sm">{errors.mainObjective.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Nature of Business or Transaction *
                  </label>
                  <Input {...register('natureOfBusiness')} />
                  {errors.natureOfBusiness && (
                    <p className="text-red-500 text-sm">{errors.natureOfBusiness.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Working Area *</label>
                  <Input {...register('workingArea')} />
                  {errors.workingArea && (
                    <p className="text-red-500 text-sm">{errors.workingArea.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Branches</label>
                  <Input type="number" {...register('numberOfBranches', { valueAsNumber: true })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Branch Locations</label>
                  <textarea
                    {...register('branchLocations')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                    placeholder="List branch locations (comma-separated or one per line)"
                  />
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Documents */}
        <AccordionItem value="documents">
          <AccordionTrigger>
            <CardTitle>12. Required Documents</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('hasBylawsConstitution')}
                    className="h-4 w-4"
                  />
                  <label>Copy of approved bylaws, constitution, or other such document</label>
                </div>
                {!hasBylawsConstitution && (
                  <div className="flex items-center space-x-2 ml-6">
                    <input type="checkbox" {...register('hasOfficialLetter')} className="h-4 w-4" />
                    <label>Official letter (if no bylaws/constitution)</label>
                  </div>
                )}
                {errors.hasOfficialLetter && (
                  <p className="text-red-500 text-sm ml-6">{errors.hasOfficialLetter.message}</p>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('hasFinancialStatement')}
                    className="h-4 w-4"
                  />
                  <label>Financial statements of the last fiscal transaction *</label>
                </div>
                {errors.hasFinancialStatement && (
                  <p className="text-red-500 text-sm">{errors.hasFinancialStatement.message}</p>
                )}

                <div className="flex items-center space-x-2">
                  <input type="checkbox" {...register('hasTaxClearance')} className="h-4 w-4" />
                  <label>Tax clearance certificate of the last fiscal year</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" {...register('hasTaxFilingDetails')} className="h-4 w-4" />
                  <label>Tax filing details of the last fiscal year</label>
                </div>
                {errors.hasTaxFilingDetails && (
                  <p className="text-red-500 text-sm">{errors.hasTaxFilingDetails.message}</p>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Financial Information */}
        <AccordionItem value="financial">
          <AccordionTrigger>
            <CardTitle>13-15. Financial Information</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Application Payment:</strong> Share Amount, Savings, and Entry Fee are required at application time.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Share Amount (Rs.) <span className="text-red-500">*</span>
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
                      <p className="text-red-500 text-sm mt-1">
                        {errors.initialShareAmount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Savings Amount (Rs.)</label>
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
                    <label className="block text-sm font-medium mb-1">Entry Fee (Rs.)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register('initialOtherAmount', { valueAsNumber: true })}
                      placeholder="e.g., 500"
                    />
                    {errors.initialOtherAmount && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.initialOtherAmount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Entry Fee Description</label>
                    <Input
                      {...register('initialOtherSpecify')}
                      placeholder="e.g., Entry Fee (Prabesh Shulka)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estimated Annual Transaction
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register('estimatedAnnualTransaction', { valueAsNumber: true })}
                    />
                    {errors.estimatedAnnualTransaction && (
                      <p className="text-red-500 text-sm">
                        {errors.estimatedAnnualTransaction.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PAN/VAT Registration No.</label>
                    <Input {...register('panVatRegistrationNo')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Board of Directors, CEO, Account Operators */}
        <AccordionItem value="personnel">
          <AccordionTrigger>
            <CardTitle>16. Board of Directors, Chief Executive, and Account Operators</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Board of Directors */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Board of Directors *</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBoard({ name: '', identificationDetails: '' })}
                    >
                      Add Director
                    </Button>
                  </div>
                  {boardFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded"
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <Input {...register(`boardOfDirectors.${index}.name`)} />
                        {errors.boardOfDirectors?.[index]?.name && (
                          <p className="text-red-500 text-sm">
                            {errors.boardOfDirectors[index]?.name?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Position</label>
                        <Input {...register(`boardOfDirectors.${index}.position`)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Identification Details *
                        </label>
                        <Input {...register(`boardOfDirectors.${index}.identificationDetails`)} />
                        {errors.boardOfDirectors?.[index]?.identificationDetails && (
                          <p className="text-red-500 text-sm">
                            {errors.boardOfDirectors[index]?.identificationDetails?.message}
                          </p>
                        )}
                        {boardFields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeBoard(index)}
                            className="mt-2"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {errors.boardOfDirectors &&
                    typeof errors.boardOfDirectors.message === 'string' && (
                      <p className="text-red-500 text-sm">{errors.boardOfDirectors.message}</p>
                    )}
                </div>

                {/* Chief Executive */}
                <div>
                  <h3 className="font-semibold mb-4">Chief Executive *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <Input {...register('chiefExecutive.name')} />
                      {errors.chiefExecutive?.name && (
                        <p className="text-red-500 text-sm">{errors.chiefExecutive.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Identification Details *
                      </label>
                      <Input {...register('chiefExecutive.identificationDetails')} />
                      {errors.chiefExecutive?.identificationDetails && (
                        <p className="text-red-500 text-sm">
                          {errors.chiefExecutive.identificationDetails.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Operators */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Account Operators *</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendOperator({ name: '', identificationDetails: '' })}
                    >
                      Add Operator
                    </Button>
                  </div>
                  {operatorFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded"
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <Input {...register(`accountOperators.${index}.name`)} />
                        {errors.accountOperators?.[index]?.name && (
                          <p className="text-red-500 text-sm">
                            {errors.accountOperators[index]?.name?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Identification Details *
                        </label>
                        <Input {...register(`accountOperators.${index}.identificationDetails`)} />
                        {errors.accountOperators?.[index]?.identificationDetails && (
                          <p className="text-red-500 text-sm">
                            {errors.accountOperators[index]?.identificationDetails?.message}
                          </p>
                        )}
                        {operatorFields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOperator(index)}
                            className="mt-2"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {errors.accountOperators &&
                    typeof errors.accountOperators.message === 'string' && (
                      <p className="text-red-500 text-sm">{errors.accountOperators.message}</p>
                    )}
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Board Decision */}
        <AccordionItem value="board-decision">
          <AccordionTrigger>
            <CardTitle>18. Board of Directors Decision</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" {...register('hasBoardDecision')} className="h-4 w-4" />
                  <label>Decision of the Board of Directors document attached</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Board Decision Date</label>
                  <Controller
                    name="boardDecisionDate"
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
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Other Details */}
        <AccordionItem value="other">
          <AccordionTrigger>
            <CardTitle>19. Other Details</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                <label className="block text-sm font-medium mb-1">
                  Other details deemed necessary by the institution
                </label>
                <textarea
                  {...register('otherDetails')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Submitting...'
            : mode === 'onboarding'
              ? 'Submit for Review'
              : 'Update KYM'}
        </Button>
      </div>
    </form>
  );
};
