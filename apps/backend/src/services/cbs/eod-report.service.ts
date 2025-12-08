import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma.js';
import { adToBs, formatBsDate } from '../../lib/nepali-date.js';

/**
 * EOD Report Generation Service
 * Generates PDF and CSV reports for End of Day (EOD) reports
 */

export interface EODReportOptions {
  language?: 'en' | 'ne' | 'both'; // English, Nepali, or both
  dateFormat?: 'ad' | 'bs' | 'both'; // AD date, BS date, or both
  includeTransactions?: boolean; // Include detailed journal entries
  includeDenominations?: boolean; // Include cash denomination breakdown
}

export interface EODReportData {
  dayBook: any;
  cooperativeName?: string;
  journalEntries?: any[]; // Detailed journal entries for the day
  options?: EODReportOptions;
}

/**
 * Format date based on options
 */
function formatDate(date: Date, options: EODReportOptions = {}): string {
  const { dateFormat = 'both' } = options;

  const adDate = date.toISOString().split('T')[0];

  if (dateFormat === 'ad') {
    return adDate;
  } else if (dateFormat === 'bs') {
    try {
      const bsDate = adToBs(date);
      return formatBsDate(bsDate);
    } catch {
      return adDate; // Fallback to AD if conversion fails
    }
  } else {
    // Both
    try {
      const bsDate = adToBs(date);
      const bsFormatted = formatBsDate(bsDate);
      return `${adDate} (${bsFormatted})`;
    } catch {
      return adDate;
    }
  }
}

/**
 * Get localized text based on language option
 */
function getText(key: string, options: EODReportOptions = {}): string {
  const { language = 'en' } = options;

  const translations: Record<string, Record<string, string>> = {
    'End of Day Report': {
      en: 'End of Day (EOD) Report',
      ne: 'दिन अन्त्य (EOD) प्रतिवेदन',
    },
    Date: {
      en: 'Date',
      ne: 'मिति',
    },
    Status: {
      en: 'Status',
      ne: 'स्थिति',
    },
    'Opening Cash': {
      en: 'Opening Cash',
      ne: 'प्रारम्भिक नगद',
    },
    'Closing Cash': {
      en: 'Closing Cash',
      ne: 'अन्तिम नगद',
    },
    'Transactions Count': {
      en: 'Transactions Count',
      ne: 'लेनदेन संख्या',
    },
    'Day Begin Information': {
      en: 'Day Begin Information',
      ne: 'दिन सुरुवात जानकारी',
    },
    'Day End Information': {
      en: 'Day End Information',
      ne: 'दिन अन्त्य जानकारी',
    },
    'Opened By': {
      en: 'Opened By',
      ne: 'सुरु गरेको',
    },
    'Closed By': {
      en: 'Closed By',
      ne: 'बन्द गरेको',
    },
    'Opened At': {
      en: 'Opened At',
      ne: 'सुरु भएको समय',
    },
    'Closed At': {
      en: 'Closed At',
      ne: 'बन्द भएको समय',
    },
    'Teller Settlements': {
      en: 'Teller Settlements',
      ne: 'टेलर निपटान',
    },
    'Settlement Summary': {
      en: 'Settlement Summary',
      ne: 'निपटान सारांश',
    },
    'Total Physical Cash': {
      en: 'Total Physical Cash',
      ne: 'कुल भौतिक नगद',
    },
    'Total System Cash': {
      en: 'Total System Cash',
      ne: 'कुल प्रणाली नगद',
    },
    'Total Difference': {
      en: 'Total Difference',
      ne: 'कुल फरक',
    },
    'Number of Settlements': {
      en: 'Number of Settlements',
      ne: 'निपटान संख्या',
    },
    'Journal Entries': {
      en: 'Journal Entries',
      ne: 'जर्नल प्रविष्टिहरू',
    },
    'Entry Number': {
      en: 'Entry Number',
      ne: 'प्रविष्टि नम्बर',
    },
    Description: {
      en: 'Description',
      ne: 'विवरण',
    },
    Account: {
      en: 'Account',
      ne: 'खाता',
    },
    Debit: {
      en: 'Debit',
      ne: 'डेबिट',
    },
    Credit: {
      en: 'Credit',
      ne: 'क्रेडिट',
    },
    'Generated on': {
      en: 'Generated on',
      ne: 'निर्माण मिति',
    },
  };

  const text = translations[key]?.[language] || translations[key]?.en || key;

  if (language === 'both') {
    const enText = translations[key]?.en || key;
    const neText = translations[key]?.ne || key;
    return `${enText} / ${neText}`;
  }

  return text;
}

/**
 * Fetch journal entries for a specific day
 */
export async function fetchJournalEntriesForDay(
  cooperativeId: string,
  dayDate: Date
): Promise<any[]> {
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);

  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      cooperativeId,
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      ledgers: {
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return journalEntries;
}

/**
 * Generate CSV content for EOD report
 */
export function generateEODCSV(data: EODReportData): string {
  const { dayBook, options = {} } = data;
  const rows: string[] = [];

  // Helper to escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Header
  rows.push(getText('End of Day Report', options));
  rows.push('');

  if (data.cooperativeName) {
    rows.push(`Cooperative,${escapeCSV(data.cooperativeName)}`);
    rows.push('');
  }

  rows.push(`${getText('Date', options)},${formatDate(dayBook.date, options)}`);
  rows.push(`${getText('Status', options)},${dayBook.status}`);
  rows.push(`${getText('Opening Cash', options)},${Number(dayBook.openingCash || 0).toFixed(2)}`);
  rows.push(`${getText('Closing Cash', options)},${Number(dayBook.closingCash || 0).toFixed(2)}`);
  rows.push(`${getText('Transactions Count', options)},${dayBook.transactionsCount || 0}`);
  rows.push('');

  // Day Begin Information
  rows.push(getText('Day Begin Information', options));
  if (dayBook.dayBeginByUser) {
    const user = dayBook.dayBeginByUser;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'N/A';
    rows.push(`${getText('Opened By', options)},${escapeCSV(userName)}`);
  }
  if (dayBook.createdAt) {
    rows.push(
      `${getText('Opened At', options)},${formatDate(new Date(dayBook.createdAt), options)}`
    );
  }
  rows.push('');

  // Day End Information
  if (dayBook.status === 'CLOSED' && dayBook.dayEndByUser) {
    rows.push(getText('Day End Information', options));
    const user = dayBook.dayEndByUser;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'N/A';
    rows.push(`${getText('Closed By', options)},${escapeCSV(userName)}`);
    if (dayBook.updatedAt) {
      rows.push(
        `${getText('Closed At', options)},${formatDate(new Date(dayBook.updatedAt), options)}`
      );
    }
    rows.push('');
  }

  // Settlements
  if (dayBook.settlements && dayBook.settlements.length > 0) {
    rows.push(getText('Teller Settlements', options));
    const headerRow = [
      'Teller Name',
      'Physical Cash',
      'System Cash',
      'Difference',
      'Status',
      'Executed By',
      'Executed At',
    ].join(',');
    rows.push(headerRow);

    for (const settlement of dayBook.settlements) {
      const tellerName = settlement.teller
        ? `${settlement.teller.firstName || ''} ${settlement.teller.lastName || ''}`.trim() ||
          settlement.teller.email ||
          'N/A'
        : 'N/A';
      const executedBy = settlement.executedByUser
        ? `${settlement.executedByUser.firstName || ''} ${settlement.executedByUser.lastName || ''}`.trim() ||
          settlement.executedByUser.email ||
          'N/A'
        : 'N/A';
      const difference = Number(settlement.physicalCash || 0) - Number(settlement.systemCash || 0);

      rows.push(
        [
          escapeCSV(tellerName),
          Number(settlement.physicalCash || 0).toFixed(2),
          Number(settlement.systemCash || 0).toFixed(2),
          difference.toFixed(2),
          settlement.status || 'N/A',
          escapeCSV(executedBy),
          settlement.executedAt ? formatDate(new Date(settlement.executedAt), options) : 'N/A',
        ].join(',')
      );
    }
    rows.push('');
  }

  // Journal Entries (if requested)
  if (options.includeTransactions && data.journalEntries && data.journalEntries.length > 0) {
    rows.push(getText('Journal Entries', options));
    rows.push(
      `${getText('Entry Number', options)},${getText('Date', options)},${getText('Description', options)},${getText('Account', options)},${getText('Debit', options)},${getText('Credit', options)}`
    );

    for (const entry of data.journalEntries) {
      for (const ledger of entry.ledgers) {
        rows.push(
          [
            escapeCSV(entry.entryNumber || ''),
            formatDate(entry.date, options),
            escapeCSV(entry.description || ''),
            escapeCSV(`${ledger.account.code} - ${ledger.account.name}`),
            Number(ledger.debit || 0).toFixed(2),
            Number(ledger.credit || 0).toFixed(2),
          ].join(',')
        );
      }
    }
    rows.push('');
  }

  // Summary
  rows.push(getText('Settlement Summary', options));
  const totalPhysicalCash =
    dayBook.settlements?.reduce((sum: number, s: any) => sum + Number(s.physicalCash || 0), 0) || 0;
  const totalSystemCash =
    dayBook.settlements?.reduce((sum: number, s: any) => sum + Number(s.systemCash || 0), 0) || 0;
  const totalDifference = totalPhysicalCash - totalSystemCash;

  rows.push(`${getText('Total Physical Cash', options)},${totalPhysicalCash.toFixed(2)}`);
  rows.push(`${getText('Total System Cash', options)},${totalSystemCash.toFixed(2)}`);
  rows.push(`${getText('Total Difference', options)},${totalDifference.toFixed(2)}`);
  rows.push(`${getText('Number of Settlements', options)},${dayBook.settlements?.length || 0}`);

  return rows.join('\n');
}

/**
 * Generate PDF buffer for EOD report
 */
export async function generateEODPDF(data: EODReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      const { dayBook, options = {} } = data;

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(getText('End of Day Report', options), { align: 'center' });
      doc.moveDown();

      // Cooperative Name (if available)
      if (data.cooperativeName) {
        doc.fontSize(12).font('Helvetica').text(data.cooperativeName, { align: 'center' });
        doc.moveDown();
      }

      // Date and Status
      doc.fontSize(14).font('Helvetica-Bold').text('Day Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`${getText('Date', options)}: ${formatDate(dayBook.date, options)}`, {
        continued: false,
      });
      doc.text(`${getText('Status', options)}: ${dayBook.status}`, { continued: false });
      doc.moveDown();

      // Financial Summary
      doc.fontSize(14).font('Helvetica-Bold').text('Financial Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(
        `${getText('Opening Cash', options)}: Rs. ${Number(dayBook.openingCash || 0).toFixed(2)}`,
        { continued: false }
      );
      doc.text(
        `${getText('Closing Cash', options)}: Rs. ${Number(dayBook.closingCash || 0).toFixed(2)}`,
        { continued: false }
      );
      doc.text(`${getText('Transactions Count', options)}: ${dayBook.transactionsCount || 0}`, {
        continued: false,
      });
      doc.moveDown();

      // Day Begin Information
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(getText('Day Begin Information', options), { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      if (dayBook.dayBeginByUser) {
        const user = dayBook.dayBeginByUser;
        const userName =
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'N/A';
        doc.text(`${getText('Opened By', options)}: ${userName}`, { continued: false });
      }
      if (dayBook.createdAt) {
        doc.text(
          `${getText('Opened At', options)}: ${formatDate(new Date(dayBook.createdAt), options)}`,
          { continued: false }
        );
      }
      doc.moveDown();

      // Day End Information
      if (dayBook.status === 'CLOSED' && dayBook.dayEndByUser) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(getText('Day End Information', options), { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        const user = dayBook.dayEndByUser;
        const userName =
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'N/A';
        doc.text(`${getText('Closed By', options)}: ${userName}`, { continued: false });
        if (dayBook.updatedAt) {
          doc.text(
            `${getText('Closed At', options)}: ${formatDate(new Date(dayBook.updatedAt), options)}`,
            { continued: false }
          );
        }
        doc.moveDown();
      }

      // Settlements Table
      if (dayBook.settlements && dayBook.settlements.length > 0) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(getText('Teller Settlements', options), { underline: true });
        doc.moveDown(0.5);

        // Table Header
        const _tableTop = doc.y;
        const col1X = 50;
        const col2X = 200;
        const col3X = 300;
        const col4X = 400;
        const col5X = 480;
        const rowHeight = 20;
        const headerY = doc.y;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Teller', col1X, headerY);
        doc.text('Physical', col2X, headerY);
        doc.text('System', col3X, headerY);
        doc.text('Difference', col4X, headerY);
        doc.text('Status', col5X, headerY);

        // Draw header line
        doc
          .moveTo(50, headerY + 15)
          .lineTo(550, headerY + 15)
          .stroke();
        doc.moveDown(0.3);

        // Table Rows
        doc.fontSize(9).font('Helvetica');
        let currentY = doc.y;

        for (const settlement of dayBook.settlements) {
          // Check if we need a new page
          if (currentY > 750) {
            doc.addPage();
            currentY = 50;
          }

          const tellerName = settlement.teller
            ? `${settlement.teller.firstName || ''} ${settlement.teller.lastName || ''}`.trim() ||
              settlement.teller.email ||
              'N/A'
            : 'N/A';
          const physicalCash = Number(settlement.physicalCash || 0);
          const systemCash = Number(settlement.systemCash || 0);
          const difference = physicalCash - systemCash;

          doc.text(tellerName.substring(0, 20), col1X, currentY, { width: 140, ellipsis: true });
          doc.text(`Rs. ${physicalCash.toFixed(2)}`, col2X, currentY);
          doc.text(`Rs. ${systemCash.toFixed(2)}`, col3X, currentY);
          if (difference !== 0) {
            doc.fillColor('red');
          } else {
            doc.fillColor('black');
          }
          doc.text(`Rs. ${difference.toFixed(2)}`, col4X, currentY);
          doc.fillColor('black'); // Reset to black
          doc.text(settlement.status || 'N/A', col5X, currentY);

          currentY += rowHeight;
          doc.y = currentY;
        }

        doc.moveDown();

        // Summary
        const totalPhysicalCash = dayBook.settlements.reduce(
          (sum: number, s: any) => sum + Number(s.physicalCash || 0),
          0
        );
        const totalSystemCash = dayBook.settlements.reduce(
          (sum: number, s: any) => sum + Number(s.systemCash || 0),
          0
        );
        const totalDifference = totalPhysicalCash - totalSystemCash;

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(getText('Settlement Summary', options), { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(
          `${getText('Total Physical Cash', options)}: Rs. ${totalPhysicalCash.toFixed(2)}`,
          { continued: false }
        );
        doc.text(`${getText('Total System Cash', options)}: Rs. ${totalSystemCash.toFixed(2)}`, {
          continued: false,
        });
        if (totalDifference !== 0) {
          doc.fillColor('red');
        } else {
          doc.fillColor('black');
        }
        doc.text(`${getText('Total Difference', options)}: Rs. ${totalDifference.toFixed(2)}`, {
          continued: false,
        });
        doc.fillColor('black'); // Reset to black
        doc.text(`${getText('Number of Settlements', options)}: ${dayBook.settlements.length}`, {
          continued: false,
        });
      }

      // Journal Entries (if requested)
      if (options.includeTransactions && data.journalEntries && data.journalEntries.length > 0) {
        doc.addPage();
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(getText('Journal Entries', options), { underline: true });
        doc.moveDown(0.5);

        for (const entry of data.journalEntries) {
          // Check if we need a new page
          if (doc.y > 750) {
            doc.addPage();
          }

          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(`${getText('Entry Number', options)}: ${entry.entryNumber || 'N/A'}`, {
            continued: false,
          });
          doc.text(`${getText('Date', options)}: ${formatDate(entry.date, options)}`, {
            continued: false,
          });
          doc.text(`${getText('Description', options)}: ${entry.description || 'N/A'}`, {
            continued: false,
          });
          doc.moveDown(0.3);

          // Entry details table
          const entryCol1X = 60;
          const _entryCol2X = 200;
          const entryCol3X = 350;
          const entryCol4X = 450;
          const entryHeaderY = doc.y;

          doc.fontSize(9).font('Helvetica-Bold');
          doc.text('Account', entryCol1X, entryHeaderY);
          doc.text('Debit', entryCol3X, entryHeaderY);
          doc.text('Credit', entryCol4X, entryHeaderY);

          doc
            .moveTo(60, entryHeaderY + 12)
            .lineTo(550, entryHeaderY + 12)
            .stroke();
          doc.moveDown(0.2);

          doc.fontSize(8).font('Helvetica');
          let entryY = doc.y;

          for (const ledger of entry.ledgers) {
            if (entryY > 750) {
              doc.addPage();
              entryY = 50;
            }

            const accountName = `${ledger.account.code} - ${ledger.account.name}`;
            doc.text(accountName.substring(0, 30), entryCol1X, entryY, {
              width: 180,
              ellipsis: true,
            });
            doc.text(`Rs. ${Number(ledger.debit || 0).toFixed(2)}`, entryCol3X, entryY);
            doc.text(`Rs. ${Number(ledger.credit || 0).toFixed(2)}`, entryCol4X, entryY);

            entryY += 15;
            doc.y = entryY;
          }

          doc.moveDown(0.5);
        }
      }

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          `${getText('Generated on', options)} ${formatDate(new Date(), options)}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get cooperative name for report
 */
export async function getCooperativeName(cooperativeId: string): Promise<string | undefined> {
  try {
    const cooperative = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { name: true },
    });
    return cooperative?.name;
  } catch (error) {
    console.error('Error fetching cooperative name:', error);
    return undefined;
  }
}
