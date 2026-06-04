import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportStudentsToPDF(students) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BK Awards 2026 — Student Records', margin, 16);

  // Subtitle / stats
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const eligible = students.filter((s) => String(s.status || '').toLowerCase() === 'eligible').length;
  doc.text(`Generated: ${dateStr}   |   Total: ${students.length}   |   Eligible: ${eligible}`, margin, 22);
  doc.setTextColor(0);

  // Table — Title uses s.board which the backend populates with the category name
  const head = [['#', 'Name', 'Father Name', 'Mobile', 'Title', '%']];

  const body = students.map((s, i) => [
    i + 1,
    s.fullName || '-',
    s.fatherName || '-',
    s.mobile || '-',
    s.board || '-',
    s.percentage != null ? `${s.percentage}%` : '-'
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 26,
    margin: { left: margin, right: margin, top: margin, bottom: margin },
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 38 },
      3: { cellWidth: 27 },
      4: { cellWidth: 55 },
      5: { cellWidth: 20, halign: 'center' }
    },
    // Page numbers in footer
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW - margin,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'right' }
      );
      doc.setTextColor(0);
    }
  });

  const filename = `students_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.pdf`;
  doc.save(filename);
}
