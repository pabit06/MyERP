import { create } from 'xmlbuilder2';
import { prisma } from '../../lib/prisma.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeFilename } from '../../lib/sanitize.js';

const GOAML_VERSION = '5.0.1';

/**
 * Generate goAML XML for a TTR report
 */
export async function generateTtrXml(ttrId: string): Promise<string> {
  const ttr = await prisma.amlTtrReport.findUnique({
    where: { id: ttrId },
    include: {
      member: {
        include: {
          kyc: true,
        },
      },
    },
  });

  if (!ttr) {
    throw new Error('TTR report not found');
  }

  // Pre-flight check - ensure all required fields are present
  const validationErrors = validateTtrData(ttr);
  if (validationErrors.length > 0) {
    throw new Error(`Missing required fields: ${validationErrors.join(', ')}`);
  }

  const member = ttr.member;
  const kyc = member.kyc;

  // Build XML structure
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('goAML', {
      xmlns: 'http://www.goaml.org/xmlns/1.0',
      version: GOAML_VERSION,
    })
    .ele('Report')
    .ele('ReportHeader')
    .ele('ReportType')
    .txt('TTR')
    .up()
    .ele('ReportDate')
    .txt(new Date().toISOString().split('T')[0])
    .up()
    .up()
    .ele('Transaction')
    .ele('TransactionDate')
    .txt(ttr.forDate.toISOString().split('T')[0])
    .up()
    .ele('TransactionAmount')
    .txt(ttr.totalAmount.toString())
    .up()
    .ele('Currency')
    .txt('NPR')
    .up()
    .ele('TransactionType')
    .txt('Cash')
    .up()
    .ele('Subject')
    .ele('SubjectType')
    .txt('Individual')
    .up()
    .ele('Name')
    .ele('FirstName')
    .txt(member.firstName || '')
    .up()
    .ele('LastName')
    .txt(member.lastName || '')
    .up();

  if (member.middleName) {
    root.ele('MiddleName').txt(member.middleName).up();
  }

  root
    .up()
    .ele('DateOfBirth')
    .txt(kyc?.dateOfBirth?.toISOString().split('T')[0] || '')
    .up()
    .ele('Nationality')
    .txt(kyc?.nationality || 'NPL')
    .up()
    .ele('Identification')
    .ele('IDType')
    .txt('Citizenship')
    .up()
    .ele('IDNumber')
    .txt(kyc?.citizenshipNumber || '')
    .up()
    .up()
    .ele('Address')
    .ele('AddressLine')
    .txt(kyc?.permanentVillageTole || kyc?.permanentMunicipality || '')
    .up()
    .ele('City')
    .txt(kyc?.permanentMunicipality || '')
    .up()
    .ele('State')
    .txt(kyc?.permanentProvince || '')
    .up()
    .ele('Country')
    .txt('NPL')
    .up()
    .up()
    .ele('Occupation')
    .txt(kyc?.occupation || '')
    .up()
    .ele('FatherName')
    .txt('')
    .up(); // Father name - add to KYC if needed

  if (member.grandfatherName) {
    root.ele('GrandfatherName').txt(member.grandfatherName).up();
  }

  root.up().up().ele('SourceOfFunds').ele('SourceType').txt('Other').up();

  // Get SOF declaration if exists
  const sofDeclaration = await prisma.sourceOfFundsDeclaration.findFirst({
    where: {
      memberId: member.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (sofDeclaration) {
    root.ele('Description').txt(sofDeclaration.declaredText).up();
  }

  root.up().up().up();

  const xml = root.end({ prettyPrint: true });

  // Save XML to file
  const uploadsDir = path.join(process.cwd(), 'uploads', 'goaml');
  await fs.mkdir(uploadsDir, { recursive: true });

  // Sanitize ttrId to prevent path traversal attacks
  const sanitizedTtrId = sanitizeFilename(ttrId);
  const fileName = `ttr_${sanitizedTtrId}_${Date.now()}.xml`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, xml, 'utf-8');

  // Update TTR with XML path
  await prisma.amlTtrReport.update({
    where: { id: ttrId },
    data: {
      xmlPath: filePath,
      status: 'approved',
    },
  });

  return filePath;
}

/**
 * Validate TTR data before generating XML
 */
function validateTtrData(ttr: any): string[] {
  const errors: string[] = [];
  const member = ttr.member;
  const kyc = member.kyc;

  if (!member.firstName) errors.push('Member First Name');
  if (!member.lastName) errors.push('Member Last Name');
  if (!kyc?.dateOfBirth) errors.push('Date of Birth');
  if (!kyc?.citizenshipNumber) errors.push('Citizenship Number');
  if (!kyc?.occupation) errors.push('Occupation');
  if (!kyc?.permanentAddress) errors.push('Permanent Address');

  return errors;
}

/**
 * Generate goAML XML for an STR report
 */
export async function generateStrXml(caseId: string): Promise<string> {
  const amlCase = await prisma.amlCase.findUnique({
    where: { id: caseId },
    include: {
      member: {
        include: {
          kyc: true,
        },
      },
    },
  });

  if (!amlCase) {
    throw new Error('AML case not found');
  }

  const member = amlCase.member;
  const kyc = member.kyc;

  // Build XML structure for STR
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('goAML', {
      xmlns: 'http://www.goaml.org/xmlns/1.0',
      version: GOAML_VERSION,
    })
    .ele('Report')
    .ele('ReportHeader')
    .ele('ReportType')
    .txt('STR')
    .up()
    .ele('ReportDate')
    .txt(new Date().toISOString().split('T')[0])
    .up()
    .up()
    .ele('SuspiciousActivity')
    .ele('ActivityDescription')
    .txt(amlCase.notes || 'Suspicious transaction activity')
    .up()
    .ele('Subject')
    .ele('SubjectType')
    .txt('Individual')
    .up()
    .ele('Name')
    .ele('FirstName')
    .txt(member.firstName || '')
    .up()
    .ele('LastName')
    .txt(member.lastName || '')
    .up();

  if (member.middleName) {
    root.ele('MiddleName').txt(member.middleName).up();
  }

  root
    .up()
    .ele('DateOfBirth')
    .txt(kyc?.dateOfBirth?.toISOString().split('T')[0] || '')
    .up()
    .ele('Nationality')
    .txt(kyc?.nationality || 'NPL')
    .up()
    .ele('Identification')
    .ele('IDType')
    .txt('Citizenship')
    .up()
    .ele('IDNumber')
    .txt(kyc?.citizenshipNumber || '')
    .up()
    .up()
    .up()
    .up()
    .up();

  const xml = root.end({ prettyPrint: true });

  // Save XML to file
  const uploadsDir = path.join(process.cwd(), 'uploads', 'goaml');
  await fs.mkdir(uploadsDir, { recursive: true });

  // Sanitize caseId to prevent path traversal attacks
  const sanitizedCaseId = sanitizeFilename(caseId);
  const fileName = `str_${sanitizedCaseId}_${Date.now()}.xml`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, xml, 'utf-8');

  return filePath;
}
