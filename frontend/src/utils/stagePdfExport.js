import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_COLORS = {
  PENDING:    [241, 245, 249],
  CALLED:     [254, 249, 195],
  ON_STAGE:   [220, 252, 231],
  COMPLETED:  [219, 234, 254],
  SKIPPED:    [243, 244, 246],
  REASSIGNED: [254, 226, 226],
};

export function exportStageToPDF(assignments) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const total = assignments.length;
  const completed = assignments.filter(a => a.status === 'COMPLETED').length;
  const onStage = assignments.filter(a => a.status === 'ON_STAGE').length;
  const pending = assignments.filter(a => a.status === 'PENDING').length;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Live Stage — Assignment Sheet', margin, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(
    `Generated: ${dateStr}   |   Total: ${total}   |   Completed: ${completed}   |   On Stage: ${onStage}   |   Pending: ${pending}`,
    margin, 22
  );
  doc.setTextColor(0);

  const head = [['Seq', 'Student', 'Category', 'Guest', 'Volunteer', 'Team Member', 'Status']];

  const body = assignments.map(a => [
    a.sequenceNo,
    a.studentId?.fullName || '-',
    a.categoryId?.title || '-',
    a.actualGuestId?.name || a.plannedGuestId?.name || '-',
    a.volunteerId?.name || '-',
    a.teamMemberId?.name || '-',
    a.status || 'PENDING',
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 27,
    margin: { left: margin, right: margin, top: margin, bottom: margin },
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 55 },
      3: { cellWidth: 42 },
      4: { cellWidth: 42 },
      5: { cellWidth: 42 },
      6: { cellWidth: 22, halign: 'center' },
    },
    bodyStyles: { minCellHeight: 9 },
    willDrawCell: (data) => {
      if (data.section === 'body') {
        const status = body[data.row.index]?.[6];
        const color = STATUS_COLORS[status] || [255, 255, 255];
        doc.setFillColor(...color);
      }
    },
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
    },
  });

  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  doc.save(`stage_assignments_${ts}.pdf`);
}
