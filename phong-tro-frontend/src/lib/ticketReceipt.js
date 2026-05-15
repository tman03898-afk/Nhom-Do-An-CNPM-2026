import { jsPDF } from 'jspdf';

function pdfSafeText(input) {
  let s = input == null ? '' : String(input);
  s = s.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s;
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('vi-VN');
}

function statusLabel(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'RESOLVED' || s === 'DONE') return 'Da hoan thanh';
  if (s === 'CLOSED') return 'Da dong';
  if (s === 'IN_PROGRESS') return 'Dang xu ly';
  if (s === 'OPEN' || s === 'PENDING') return 'Cho xu ly';
  return s || '-';
}

function priorityLabel(priority) {
  const p = String(priority || '').toUpperCase();
  if (p === 'HIGH') return 'Khan cap';
  if (p === 'LOW') return 'Thap';
  return 'Trung binh';
}

function moneyLabel(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(pdfSafeText(text || '-'), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function canPrintTicketReceipt(ticket) {
  const status = String(ticket?.status || '').toUpperCase();
  return status === 'RESOLVED' || status === 'DONE' || status === 'CLOSED';
}

export function printTicketReceipt(ticket, viewer = {}) {
  if (!ticket || !canPrintTicketReceipt(ticket)) return false;

  const receiptNo = `SC-${String(ticket.incident_id || '').padStart(6, '0')}`;
  const tenantName = ticket.reported_by_full_name || viewer.full_name || viewer.name || 'Khach thue';
  const tenantEmail = ticket.reported_by_email || viewer.email || '';
  const roomNumber = ticket.room_number || viewer.room_number || '';
  const assignee = ticket.assigned_to_full_name || ticket.assigned_to_email || 'Ban quan ly';
  const issuedAt = ticket.updated_at || new Date().toISOString();
  const repairCost = ticket.repair_cost ?? 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(15, 58, 64);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('THE NEST', margin, 13);
  doc.setFontSize(18);
  doc.text(pdfSafeText('BIEN LAI SUA CHUA'), margin, 25);
  doc.setFontSize(11);
  doc.text(receiptNo, pageWidth - margin, 14, { align: 'right' });

  doc.setTextColor(15, 58, 64);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfSafeText(`Ngay lap: ${formatDateTime(issuedAt)}`), pageWidth - margin, 25, { align: 'right' });

  let y = 46;
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.6);
  doc.line(margin, y - 6, pageWidth - margin, y - 6);

  const boxW = (contentWidth - 8) / 2;
  const boxH = 24;
  const boxes = [
    ['Khach thue', tenantEmail ? `${tenantName}\n${tenantEmail}` : tenantName],
    ['Phong', roomNumber ? `Phong ${roomNumber}` : '-'],
    ['Ma phieu', `#${ticket.incident_id || '-'}`],
    ['Trang thai', statusLabel(ticket.status)],
    ['Muc uu tien', priorityLabel(ticket.priority)],
    ['Chi phi sua chua', moneyLabel(repairCost)],
    ['Nguoi phu trach', assignee],
  ];

  boxes.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (boxW + 8);
    const yy = y + row * (boxH + 6);
    doc.setDrawColor(215, 236, 239);
    doc.setFillColor(248, 253, 253);
    doc.roundedRect(x, yy, boxW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(74, 120, 124);
    doc.text(pdfSafeText(label.toUpperCase()), x + 4, yy + 7);
    doc.setFontSize(10);
    doc.setTextColor(15, 58, 64);
    addWrappedText(doc, value, x + 4, yy + 14, boxW - 8, 4.5);
  });

  y += Math.ceil(boxes.length / 2) * (boxH + 6) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(74, 120, 124);
  doc.text(pdfSafeText('NOI DUNG YEU CAU'), margin, y);

  y += 7;
  doc.setDrawColor(215, 236, 239);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 54, 2, 2, 'FD');
  doc.setTextColor(15, 58, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  y = addWrappedText(doc, ticket.title || '-', margin + 5, y + 8, contentWidth - 10, 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  addWrappedText(doc, ticket.description || '-', margin + 5, y + 4, contentWidth - 10, 5);

  y = 164;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(74, 120, 124);
  doc.text(
    pdfSafeText('Bien lai online xac nhan yeu cau bao tri da duoc xu ly trong he thong.'),
    margin,
    y
  );

  y += 32;
  doc.setDrawColor(130, 171, 176);
  doc.line(margin + 10, y, margin + 70, y);
  doc.line(pageWidth - margin - 70, y, pageWidth - margin - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 58, 64);
  doc.text(pdfSafeText('Xac nhan khach thue'), margin + 40, y + 7, { align: 'center' });
  doc.text(pdfSafeText('Xac nhan ban quan ly'), pageWidth - margin - 40, y + 7, { align: 'center' });

  const safeReceiptNo = receiptNo.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  doc.save(`bien-lai-sua-chua-${safeReceiptNo}.pdf`);
  return true;
}
