import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { ReportResult, ReportConfig } from './report-builder.js';

export class ReportExporter {
  /**
   * Export report to CSV
   */
  static toCSV(report: ReportResult, res: Response) {
    const { config, data } = report;
    const columns = config.columns;

    // Header row
    const headers = columns.map((col) => `"${col.label}"`).join(',');

    // Data rows
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          let value = row[col.key];

          // Handle null/undefined
          if (value === null || value === undefined) {
            return '';
          }

          // Escape quotes in strings
          if (typeof value === 'string') {
            value = value.replace(/"/g, '""');
          }

          // Format dates specifically for CSV if needed, otherwise rely on string conversion
          if (value instanceof Date) {
            return value.toISOString().split('T')[0];
          }

          return `"${value}"`;
        })
        .join(',');
    });

    const csvContent = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${config.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csvContent);
  }

  /**
   * Export report to PDF
   */
  static toPDF(report: ReportResult, res: Response) {
    const { config, data } = report;
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${config.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(18).text(config.name, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    // Table Headers
    const tableTop = doc.y;
    const columnCount = config.columns.length;
    const columnWidth = (doc.page.width - 60) / columnCount;

    let currentX = 30;

    doc.font('Helvetica-Bold').fontSize(10);
    config.columns.forEach((col) => {
      doc.text(col.label, currentX, tableTop, { width: columnWidth, align: 'left' });
      currentX += columnWidth;
    });

    // Draw header line
    doc
      .moveTo(30, tableTop + 15)
      .lineTo(doc.page.width - 30, tableTop + 15)
      .stroke();

    // Table Data
    let currentY = tableTop + 20;
    doc.font('Helvetica').fontSize(9);

    data.forEach((row) => {
      // Check for page break
      if (currentY > doc.page.height - 50) {
        doc.addPage();
        currentY = 30;
        // Re-draw headers on new page? Optional but good for UX. skipping for simple v1
      }

      currentX = 30;
      config.columns.forEach((col) => {
        let value = row[col.key];

        // Simple formatting
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        } else if (value === null || value === undefined) {
          value = '-';
        } else {
          value = String(value);
        }

        doc.text(value as string, currentX, currentY, {
          width: columnWidth,
          align: 'left',
          height: 20,
        });
        currentX += columnWidth;
      });

      currentY += 20;
    });

    doc.end();
  }
}
