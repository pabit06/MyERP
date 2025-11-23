import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { generateMemberNumber } from '../lib/member-number.js';
import { updateMemberRisk } from '../services/aml/risk.js';
import { getOccupationRisk } from '@myerp/shared-types';
import { postEntryFee, getCurrentSharePrice, postAdvancePayment, transferAdvancePayment, refundAdvancePayment, refundOrWaiveEntryFee } from '../services/accounting.js';
import { amlEvents, AML_EVENTS } from '../lib/events.js';

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/member-workflow/:memberId/kyc
 * Get KYM (Know Your Member) information for a member
 */
router.get('/:memberId/kyc', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Check for KYC based on member type
    let kyc = null;
    
    if (member.memberType === 'INSTITUTION') {
      kyc = await prisma.institutionKYC.findUnique({
        where: { memberId },
      });
    } else {
      kyc = await prisma.memberKYC.findUnique({
        where: { memberId },
        include: {
          bodMeeting: {
            select: {
              id: true,
              title: true,
              scheduledDate: true,
            },
          },
          otherCooperativeMemberships: true,
          familyMemberCooperativeMemberships: true,
          familyMemberInThisInstitution: true,
          otherEarningFamilyMembers: true,
          incomeSourceDetails: true,
        },
      });
    }

    res.json({ kyc: kyc || null, workflowStatus: member.workflowStatus });
  } catch (error) {
    console.error('Get KYM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/member-workflow/:memberId/kyc
 * Create or update KYM (Know Your Member) information
 */
router.post('/:memberId/kyc', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;
    const kycData = req.body;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Check if KYM already exists
    const existingKYC = await prisma.memberKYC.findUnique({
      where: { memberId },
    });

    // Extract related data that needs separate handling
    const {
      otherCooperativeMemberships,
      familyMemberCooperativeMemberships,
      familyMemberInstitutionMemberships,
      otherEarningFamilyMembers,
      incomeSourceDetails,
      name,
      surname,
      ...kycMainData
    } = kycData;

    // Prepare KYM data, handling date conversions
    const kycDataToSave: any = {
      ...kycMainData,
      memberId,
      cooperativeId: tenantId,
      isComplete: true,
      completedAt: new Date(),
    };

    // Convert dateOfBirth to Date object if it's a string
    if (kycDataToSave.dateOfBirth && typeof kycDataToSave.dateOfBirth === 'string') {
      kycDataToSave.dateOfBirth = new Date(kycDataToSave.dateOfBirth);
    }

    // Convert declarationDate to Date object if it's a string
    if (kycDataToSave.declarationDate && typeof kycDataToSave.declarationDate === 'string') {
      kycDataToSave.declarationDate = new Date(kycDataToSave.declarationDate);
    }

    // Validate required fields
    if (!kycDataToSave.initialShareAmount || Number(kycDataToSave.initialShareAmount) <= 0) {
      res.status(400).json({ 
        error: 'Share amount is required and must be greater than 0',
        field: 'initialShareAmount'
      });
      return;
    }

    // Validate share amount is divisible by 100 (per kitta = Rs. 100)
    const shareAmount = Number(kycDataToSave.initialShareAmount);
    if (shareAmount % 100 !== 0) {
      res.status(400).json({ 
        error: 'Share amount must be divisible by 100 (per kitta = Rs. 100)',
        field: 'initialShareAmount'
      });
      return;
    }

    // Convert numeric fields
    const numericFields = [
      'initialShareAmount',
      'initialSavingsAmount',
      'initialOtherAmount',
      'estimatedAnnualDeposit',
      'estimatedLoanAmount',
      'monthlyIncome',
    ];

    numericFields.forEach((field) => {
      if (kycDataToSave[field] !== undefined && kycDataToSave[field] !== null) {
        if (typeof kycDataToSave[field] === 'string') {
          kycDataToSave[field] = parseFloat(kycDataToSave[field]);
        }
      }
    });

    // Convert integer fields
    if (
      kycDataToSave.estimatedTransactionsPerYear !== undefined &&
      kycDataToSave.estimatedTransactionsPerYear !== null
    ) {
      if (typeof kycDataToSave.estimatedTransactionsPerYear === 'string') {
        kycDataToSave.estimatedTransactionsPerYear = parseInt(
          kycDataToSave.estimatedTransactionsPerYear
        );
      }
    }

    // Remove empty strings and convert to null for optional fields
    const optionalStringFields = [
      'dateOfBirthBS',
      'maritalStatus',
      'educationalQualification',
      'religion',
      'casteEthnicity',
      'maidenAddress',
      'gender',
      'nationality',
      'citizenshipNumber',
      'citizenshipIssuingOffice',
      'citizenshipIssuingDistrict',
      'grandfatherName',
      'fatherName',
      'motherName',
      'spouseName',
      'spouseSurname',
      'familyType',
      'permanentProvince',
      'permanentMunicipality',
      'permanentWard',
      'permanentVillageTole',
      'permanentHouseNo',
      'permanentAddress',
      'temporaryProvince',
      'temporaryMunicipality',
      'temporaryWard',
      'temporaryVillageTole',
      'temporaryHouseNo',
      'temporaryAddress',
      'residenceType',
      'residenceDuration',
      'city',
      'state',
      'postalCode',
      'country',
      'contactNo',
      'emailId',
      'alternatePhone',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelation',
      'voterIdCardNo',
      'pollingStation',
      'passportNo',
      'occupation',
      'occupationSpecify',
      'panNo',
      'spouseOccupation',
      'spouseOccupationSpecify',
      'pepName',
      'pepRelationship',
      'pepPosition',
      'annualFamilyIncome',
      'initialOtherSpecify',
      'membershipObjective',
      'dualMembershipPurpose',
      'signaturePath',
      'fingerprintRightPath',
      'fingerprintLeftPath',
      'citizenshipCopyPath',
      'voterIdCopyPath',
      'passportCopyPath',
      'recommender1Name',
      'recommender1MembershipNo',
      'recommender1SignaturePath',
      'recommender2Name',
      'recommender2MembershipNo',
      'recommender2SignaturePath',
      'employerName',
      'employerAddress',
      'bankName',
      'bankAccountNumber',
      'bankBranch',
      'nomineeName',
      'nomineeRelation',
      'nomineeAddress',
      'nomineePhone',
    ];

    optionalStringFields.forEach((field) => {
      if (kycDataToSave[field] === '') {
        kycDataToSave[field] = null;
      }
    });

    // Use transaction to ensure data consistency
    const kyc = await prisma.$transaction(async (tx) => {
      let savedKyc;
      if (existingKYC) {
        savedKyc = await tx.memberKYC.update({
          where: { memberId },
          data: kycDataToSave,
        });

        // Delete existing related records
        await tx.otherCooperativeMembership.deleteMany({ where: { memberKycId: savedKyc.id } });
        await tx.familyMemberCooperativeMembership.deleteMany({
          where: { memberKycId: savedKyc.id },
        });
        await tx.familyMemberInThisInstitution.deleteMany({ where: { memberKycId: savedKyc.id } });
        await tx.otherEarningFamilyMember.deleteMany({ where: { memberKycId: savedKyc.id } });
        await tx.incomeSourceDetail.deleteMany({ where: { memberKycId: savedKyc.id } });
      } else {
        savedKyc = await tx.memberKYC.create({
          data: kycDataToSave,
        });
      }

      // Create related records
      if (otherCooperativeMemberships && Array.isArray(otherCooperativeMemberships)) {
        await tx.otherCooperativeMembership.createMany({
          data: otherCooperativeMemberships.map((item: any) => ({
            memberKycId: savedKyc.id,
            sn: item.sn,
            institutionName: item.institutionName,
            institutionAddress: item.institutionAddress,
            membershipNo: item.membershipNo,
          })),
        });
      }

      if (familyMemberCooperativeMemberships && Array.isArray(familyMemberCooperativeMemberships)) {
        await tx.familyMemberCooperativeMembership.createMany({
          data: familyMemberCooperativeMemberships.map((item: any) => ({
            memberKycId: savedKyc.id,
            sn: item.sn,
            nameSurnameRelationship:
              item.nameSurnameRelationship ||
              `${item.name || ''} ${item.surname || ''} ${item.relationship || ''}`.trim(),
            institutionNameAddress:
              item.institutionNameAddress ||
              `${item.institutionName || ''} ${item.institutionAddress || ''}`.trim(),
            membershipNo: item.membershipNo,
          })),
        });
      }

      if (familyMemberInstitutionMemberships && Array.isArray(familyMemberInstitutionMemberships)) {
        await tx.familyMemberInThisInstitution.createMany({
          data: familyMemberInstitutionMemberships.map((item: any) => ({
            memberKycId: savedKyc.id,
            sn: item.sn,
            nameSurname: item.nameSurname || `${item.name || ''} ${item.surname || ''}`.trim(),
            membershipNo: item.membershipNo,
          })),
        });
      }

      if (otherEarningFamilyMembers && Array.isArray(otherEarningFamilyMembers)) {
        await tx.otherEarningFamilyMember.createMany({
          data: otherEarningFamilyMembers.map((item: any) => ({
            memberKycId: savedKyc.id,
            relationship: item.relationship,
            occupation: item.occupation,
            occupationSpecify: item.occupationSpecify || null,
          })),
        });
      }

      if (incomeSourceDetails && Array.isArray(incomeSourceDetails)) {
        await tx.incomeSourceDetail.createMany({
          data: incomeSourceDetails.map((item: any) => ({
            memberKycId: savedKyc.id,
            sn: item.sn,
            source: item.source,
            sourceSpecify: item.sourceSpecify || null,
            amount: item.amount,
          })),
        });
      }

      return savedKyc;
    });

    // Update member with PEP status and grandfather name from KYC
    const memberUpdateData: any = {
      pepStatus: kycDataToSave.pepStatus || false,
      grandfatherName: kycDataToSave.grandfatherName || null,
      lastKymUpdate: new Date(),
    };

    // Update risk factors based on occupation
    if (kycDataToSave.occupation) {
      const riskLevel = getOccupationRisk(kycDataToSave.occupation);
      const currentRiskFactors = (member.riskFactors as string[]) || [];
      let updatedRiskFactors = [...currentRiskFactors];

      // Remove OCCUPATION if it exists
      updatedRiskFactors = updatedRiskFactors.filter((f) => f !== 'OCCUPATION');

      // Add OCCUPATION if high risk
      if (riskLevel === 'HIGH') {
        updatedRiskFactors.push('OCCUPATION');
      }

      memberUpdateData.riskFactors = updatedRiskFactors;
    }

    await prisma.member.update({
      where: { id: memberId },
      data: {
        workflowStatus: 'under_review',
        ...memberUpdateData,
      },
    });

    // Trigger automatic risk assessment
    try {
      await updateMemberRisk(memberId);
    } catch (riskError) {
      console.error('Error updating member risk:', riskError);
      // Don't fail the request if risk update fails
    }

    // Record payments when application is submitted
    try {
      const initialShareAmount = kycDataToSave.initialShareAmount ? Number(kycDataToSave.initialShareAmount) : 0;
      const initialSavingsAmount = kycDataToSave.initialSavingsAmount ? Number(kycDataToSave.initialSavingsAmount) : 0;
      const entryFeeAmount = kycDataToSave.initialOtherAmount ? Number(kycDataToSave.initialOtherAmount) : 0;

      // Entry fee is posted directly to income (non-refundable, compulsory)
      if (entryFeeAmount > 0) {
        // Generate temporary member identifier for entry fee posting
        const tempMemberId = `TEMP-${memberId.substring(0, 8)}`;
        await postEntryFee(tenantId, entryFeeAmount, memberId, tempMemberId, new Date());
      }

      // Share capital and savings are recorded as advance payment (refundable if rejected)
      const advanceAmount = initialShareAmount + initialSavingsAmount;
      if (advanceAmount > 0) {
        const memberName = member.fullName || member.institutionName || `${member.firstName} ${member.lastName}`.trim() || 'Unknown';
        await postAdvancePayment(
          tenantId,
          advanceAmount,
          memberId,
          memberName,
          new Date()
        );
      }
    } catch (paymentError) {
      console.error('Error recording payments:', paymentError);
      // Don't fail the KYC submission if payment recording fails, but log it
    }

    // Create workflow history entry
    await prisma.memberWorkflowHistory.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        fromStatus: member.workflowStatus,
        toStatus: 'under_review',
        action: 'kyc_submitted',
        performedBy: req.user!.userId,
      },
    });

    // Fetch complete KYM with relations
    const completeKyc = await prisma.memberKYC.findUnique({
      where: { memberId },
      include: {
        otherCooperativeMemberships: true,
        familyMemberCooperativeMemberships: true,
        familyMemberInThisInstitution: true,
        otherEarningFamilyMembers: true,
        incomeSourceDetails: true,
      },
    });

    res.json({ kyc: completeKyc });
  } catch (error) {
    console.error('Create/Update KYM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/member-workflow/:memberId/review
 * Review KYM (move to under_review or approved)
 */
router.post('/:memberId/review', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;
    const { action, remarks } = req.body; // action: "approve" or "reject"

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Get KYC based on member type
    let kyc: any = null;
    let isInstitution = false;
    
    if (member.memberType === 'INSTITUTION') {
      kyc = await prisma.institutionKYC.findUnique({
        where: { memberId },
      });
      isInstitution = true;
    } else {
      kyc = await prisma.memberKYC.findUnique({
        where: { memberId },
      });
    }

    // Check if KYC exists
    if (!kyc) {
      res.status(400).json({
        error: 'KYM not completed',
        message: 'KYM information not found. Please complete the KYM form first.',
      });
      return;
    }

    // If isComplete is not set but KYC exists and member is in review status, allow approval and set isComplete
    if (!kyc.isComplete) {
      // If member is already in review status, KYM was submitted, so mark as complete
      if (member.workflowStatus === 'under_review') {
        if (isInstitution) {
          await prisma.institutionKYC.update({
            where: { memberId },
            data: {
              isComplete: true,
              completedAt: new Date(),
            },
          });
        } else {
          await prisma.memberKYC.update({
            where: { memberId },
            data: {
              isComplete: true,
              completedAt: new Date(),
            },
          });
        }
        // Update the kyc object for use below
        kyc.isComplete = true;
      } else {
        res.status(400).json({
          error: 'KYM not completed',
          message:
            'KYM form has not been completed. Current workflow status: ' + member.workflowStatus,
        });
        return;
      }
    }

    let newStatus: string;
    let workflowAction: string;

    if (action === 'approve') {
      // First, set status to approved
      newStatus = 'approved';
      workflowAction = 'kyc_approved';

      // Generate member number if not already assigned (with retry logic for race conditions)
      let memberNumber = member.memberNumber;
      if (!memberNumber) {
        const maxRetries = 5;
        let retries = 0;
        while (retries < maxRetries) {
          try {
            memberNumber = await generateMemberNumber(tenantId);
            await prisma.member.update({
              where: { id: memberId },
              data: { memberNumber },
            });
            break; // Success, exit retry loop
          } catch (error: any) {
            if (error.code === 'P2002' && error.meta?.target?.includes('memberNumber')) {
              retries++;
              if (retries >= maxRetries) {
                throw new Error('Failed to assign member number after multiple retries. Please try again.');
              }
              // Wait before retrying (exponential backoff)
              await new Promise((resolve) => setTimeout(resolve, 100 * retries));
              continue;
            }
            throw error; // Re-throw if it's not a unique constraint error
          }
        }
      }

      // Update KYC based on member type
      if (isInstitution) {
        await prisma.institutionKYC.update({
          where: { memberId },
          data: {
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            approvedBy: req.user!.userId,
            approvedAt: new Date(),
            remarks,
          },
        });
      } else {
        await prisma.memberKYC.update({
          where: { memberId },
          data: {
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            approvedBy: req.user!.userId,
            approvedAt: new Date(),
            remarks,
          },
        });
      }

      // Transfer advance payment to share capital and issue shares
      // Note: Entry fee was already posted to income when application was submitted (non-refundable)
      try {
        const initialShareAmount = kyc.initialShareAmount ? Number(kyc.initialShareAmount) : 0;
        const initialSavingsAmount = kyc.initialSavingsAmount ? Number(kyc.initialSavingsAmount) : 0;
        const advanceAmount = initialShareAmount + initialSavingsAmount;

        console.log(`[Member Approval] Processing shares for member ${memberId}:`, {
          initialShareAmount,
          initialSavingsAmount,
          advanceAmount,
        });

        if (advanceAmount > 0) {
          // Issue shares if applicable (this will transfer share amount from advance)
          if (initialShareAmount > 0) {
            const sharePrice = await getCurrentSharePrice(tenantId, 100);
            const shares = Math.floor(initialShareAmount / sharePrice);

            console.log(`[Member Approval] Share calculation:`, {
              sharePrice,
              shares,
              amount: initialShareAmount,
            });

            if (shares > 0) {
              const { ShareService } = await import('../services/share.service.js');
              const shareTx = await ShareService.issueShares({
                cooperativeId: tenantId,
                memberId,
                kitta: shares,
                amount: initialShareAmount, // Use exact initialShareAmount to ensure accounting matches
                date: new Date(),
                paymentMode: 'CASH',
                remarks: 'Initial share purchase upon member approval (from advance payment)',
                userId: req.user!.userId,
                fromAdvancePayment: true, // Payment was already received as advance
              });
              console.log(`[Member Approval] Shares issued successfully:`, shareTx.id);
            } else {
              console.warn(`[Member Approval] Share amount ${initialShareAmount} is less than share price ${sharePrice}, no shares issued`);
            }
          }

          // Handle initialSavingsAmount - treat as additional shares for now
          if (initialSavingsAmount > 0) {
            const sharePrice = await getCurrentSharePrice(tenantId, 100);
            const savingsShares = Math.floor(initialSavingsAmount / sharePrice);

            console.log(`[Member Approval] Savings to shares calculation:`, {
              sharePrice,
              savingsShares,
              amount: initialSavingsAmount,
            });

            if (savingsShares > 0) {
              const { ShareService } = await import('../services/share.service.js');
              const shareTx = await ShareService.issueShares({
                cooperativeId: tenantId,
                memberId,
                kitta: savingsShares,
                amount: initialSavingsAmount, // Use exact initialSavingsAmount to ensure accounting matches
                date: new Date(),
                paymentMode: 'CASH',
                remarks: 'Initial savings converted to shares upon member approval (from advance payment)',
                userId: req.user!.userId,
                fromAdvancePayment: true,
              });
              console.log(`[Member Approval] Savings shares issued successfully:`, shareTx.id);
            } else {
              console.warn(`[Member Approval] Savings amount ${initialSavingsAmount} is less than share price ${sharePrice}, no shares issued`);
            }
          }
        } else {
          console.warn(`[Member Approval] No advance payment amount (share: ${initialShareAmount}, savings: ${initialSavingsAmount}), no shares issued`);
        }
      } catch (accountingError) {
        console.error('[Member Approval] Error transferring advance payment during approval:', accountingError);
        console.error('[Member Approval] Error details:', {
          message: accountingError instanceof Error ? accountingError.message : String(accountingError),
          stack: accountingError instanceof Error ? accountingError.stack : undefined,
        });
        // Don't fail the approval if accounting posting fails, but log it
      }
    } else if (action === 'reject') {
      newStatus = 'rejected';
      workflowAction = 'kyc_rejected';

      // Update KYC based on member type
      if (isInstitution) {
        await prisma.institutionKYC.update({
          where: { memberId },
          data: {
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            remarks,
          },
        });
      } else {
        await prisma.memberKYC.update({
          where: { memberId },
          data: {
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            remarks,
          },
        });
      }

      // Refund advance payment if any
      try {
        const initialShareAmount = kyc.initialShareAmount ? Number(kyc.initialShareAmount) : 0;
        const initialSavingsAmount = kyc.initialSavingsAmount ? Number(kyc.initialSavingsAmount) : 0;
        const entryFeeAmount = kyc.initialOtherAmount ? Number(kyc.initialOtherAmount) : 0;
        const totalAdvanceAmount = initialShareAmount + initialSavingsAmount + entryFeeAmount;

        if (totalAdvanceAmount > 0) {
          const memberName = member.fullName || member.institutionName || `${member.firstName} ${member.lastName}`.trim() || 'Unknown';
          await refundAdvancePayment(
            tenantId,
            totalAdvanceAmount,
            memberId,
            memberName,
            new Date()
          );
        }
      } catch (refundError) {
        console.error('Error refunding advance payment:', refundError);
        // Don't fail the rejection if refund fails, but log it
      }
    } else {
      // Just mark as under review
      newStatus = 'under_review';
      workflowAction = 'kyc_reviewed';

      // Update KYC based on member type
      if (isInstitution) {
        await prisma.institutionKYC.update({
          where: { memberId },
          data: {
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            remarks,
          },
        });
      } else {
        await prisma.memberKYC.update({
          where: { memberId },
          data: {
            reviewedBy: req.user!.userId,
            reviewedAt: new Date(),
            remarks,
          },
        });
      }
    }

    // Update member workflow status
    await prisma.member.update({
      where: { id: memberId },
      data: { workflowStatus: newStatus },
    });

    // Create workflow history entry
    await prisma.memberWorkflowHistory.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        fromStatus: member.workflowStatus,
        toStatus: newStatus,
        action: workflowAction,
        performedBy: req.user!.userId,
        remarks,
      },
    });

    // Automatically send to BOD Meeting after approval
    let finalStatus = newStatus;
    if (action === 'approve' && newStatus === 'approved') {
      try {
        // Update member workflow status to bod_pending (without meeting assignment)
        // Meeting will be assigned later when meeting is created
        await prisma.member.update({
          where: { id: memberId },
          data: { workflowStatus: 'bod_pending' },
        });

        // Create workflow history entry for BOD
        await prisma.memberWorkflowHistory.create({
          data: {
            memberId,
            cooperativeId: tenantId,
            fromStatus: 'approved',
            toStatus: 'bod_pending',
            action: 'sent_to_agenda',
            performedBy: req.user!.userId,
            remarks: 'Automatically added to pending agenda for BOD approval after manager approval',
          },
        });

        // Update response status
        finalStatus = 'bod_pending';
      } catch (bodError) {
        console.error('Error automatically sending to BOD:', bodError);
        // Don't fail the approval if BOD send fails, but log it
        // Keep status as 'approved' if BOD send fails
      }
    }

    res.json({ 
      message: action === 'approve' && finalStatus === 'bod_pending' 
        ? 'Member approved and automatically sent to BOD meeting agenda' 
        : 'KYM reviewed successfully', 
      workflowStatus: finalStatus 
    });
  } catch (error) {
    console.error('Review KYM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/member-workflow/:memberId/send-to-bod
 * Send approved member to BOD meeting
 */
router.post('/:memberId/send-to-bod', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (member.workflowStatus !== 'approved') {
      res.status(400).json({ error: 'Member must be approved before sending to BOD' });
      return;
    }

    // Update member workflow status to bod_pending (without meeting assignment)
    // Meeting will be assigned later when meeting is created
    await prisma.member.update({
      where: { id: memberId },
      data: { workflowStatus: 'bod_pending' },
    });

    // Create workflow history entry
    await prisma.memberWorkflowHistory.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        fromStatus: member.workflowStatus,
        toStatus: 'bod_pending',
        action: 'sent_to_agenda',
        performedBy: req.user!.userId,
        remarks: 'Added to pending agenda for BOD approval',
      },
    });

    res.json({
      message: 'Member added to pending agenda successfully. You can assign to a meeting later.',
      workflowStatus: 'bod_pending',
    });
  } catch (error) {
    console.error('Send to BOD error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/member-workflow/:memberId/bod-approve
 * Approve member from BOD meeting
 */
router.post('/:memberId/bod-approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;
    const { meetingId, remarks } = req.body;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (member.workflowStatus !== 'bod_pending') {
      res.status(400).json({ error: 'Member must be pending BOD approval' });
      return;
    }

    // Update KYM with BOD approval
    await prisma.memberKYC.update({
      where: { memberId },
      data: {
        bodMeetingId: meetingId,
        bodApprovedAt: new Date(),
        remarks: remarks || undefined,
      },
    });

    // Update member workflow status to active
    await prisma.member.update({
      where: { id: memberId },
      data: {
        workflowStatus: 'active',
        isActive: true,
      },
    });

    // Create workflow history entry
    await prisma.memberWorkflowHistory.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        fromStatus: member.workflowStatus,
        toStatus: 'active',
        action: 'bod_approved',
        performedBy: req.user!.userId,
        remarks: remarks || 'Approved by Board of Directors',
      },
    });

    res.json({
      message: 'Member approved by BOD and activated successfully',
      workflowStatus: 'active',
    });
  } catch (error) {
    console.error('BOD approve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/member-workflow/pending-agenda
 * Get all pending agenda items (members waiting for BOD approval, not assigned to any meeting)
 */
router.get('/pending-agenda', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get all pending member approvals not assigned to any meeting
    const pendingMemberApprovals = await prisma.memberKYC.findMany({
      where: {
        cooperativeId: tenantId,
        bodMeetingId: null, // Not assigned to any meeting
        member: {
          workflowStatus: 'bod_pending',
        },
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            institutionName: true,
            memberType: true,
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Format pending agenda items
    const pendingAgendaItems = pendingMemberApprovals.map((kyc) => {
      const member = kyc.member;
      const memberName =
        member.memberType === 'INSTITUTION'
          ? member.institutionName || 'Institution Member'
          : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
            'Member';

      return {
        id: kyc.id,
        type: 'member_approval',
        title: 'सदस्यता अनुमोदन (Member Approval)',
        description: `${memberName} (Member #: ${member.memberNumber || 'Pending'}) - KYM approval for membership`,
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: memberName,
        submittedAt: kyc.completedAt,
      };
    });

    res.json({ pendingAgendaItems });
  } catch (error) {
    console.error('Get pending agenda error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/member-workflow/:memberId/history
 * Get workflow history for a member
 */
router.get('/:memberId/history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const history = await prisma.memberWorkflowHistory.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ history });
  } catch (error) {
    console.error('Get workflow history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
