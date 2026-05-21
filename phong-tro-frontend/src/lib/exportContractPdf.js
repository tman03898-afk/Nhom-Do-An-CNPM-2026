import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pdfSafeText } from './exportInvoicesPdf';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('vi-VN');
}

function moneyPdf(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `${num.toLocaleString('vi-VN')} VND`;
}

function contractStatusPdf(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') return 'Dang hieu luc';
  if (s === 'EXPIRED') return 'Het han';
  if (s === 'TERMINATED') return 'Da thanh ly';
  return s || '-';
}

function assetStatusPdf(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'OK') return 'Tot';
  if (s === 'BROKEN') return 'Hong';
  if (s === 'MAINTENANCE') return 'Bao tri';
  if (s === 'LOST') return 'Mat';
  return s || '-';
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(pdfSafeText(text || '-'), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/**
 * Xuất PDF hop dong thue phong (client-side, jsPDF).
 * @returns {boolean} true neu da luu file
 */
export function exportContractPdf({ contract, room, assets = [], tenant, rules = [] }) {
  if (!contract?.contract_id) return false;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const tenantName = tenant?.full_name || 'Khach thue';
  const tenantEmail = tenant?.email || '';
  const tenantPhone = tenant?.phone || '';
  const roomNumber = room?.room_number || contract?.room_number || '-';
  const contractNo = `HD-${String(contract.contract_id).padStart(6, '0')}`;
  const issuedAt = contract.updated_at || contract.created_at || new Date().toISOString();

  doc.setFillColor(15, 58, 64);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('THE SUN', margin, 14);
  doc.setFontSize(17);
  doc.text(pdfSafeText('HOP DONG THUE PHONG'), margin, 26);
  doc.setFontSize(10);
  doc.text(contractNo, pageWidth - margin, 14, { align: 'right' });
  doc.text(pdfSafeText(`Ngay xuat: ${formatDateTime(new Date())}`), pageWidth - margin, 22, { align: 'right' });
  doc.text(pdfSafeText(`Cap nhat HD: ${formatDateTime(issuedAt)}`), pageWidth - margin, 28, { align: 'right' });

  let y = 46;
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.6);
  doc.line(margin, y - 6, pageWidth - margin, y - 6);

  const boxW = (contentWidth - 8) / 2;
  const boxH = 22;
  const infoBoxes = [
    ['Ben thue', tenantEmail ? `${tenantName}\n${tenantEmail}` : tenantName],
    ['Lien he', tenantPhone || '-'],
    ['Phong thue', roomNumber ? `Phong ${roomNumber}` : '-'],
    ['Trang thai HD', contractStatusPdf(contract.status)],
    ['Bat dau', formatDate(contract.start_date)],
    ['Ket thuc', formatDate(contract.end_date)],
    ['Tien thue/thang', moneyPdf(contract.rent_price)],
    ['Tien coc', moneyPdf(contract.deposit)],
  ];

  infoBoxes.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (boxW + 8);
    const yy = y + row * (boxH + 5);
    doc.setDrawColor(215, 236, 239);
    doc.setFillColor(248, 253, 253);
    doc.roundedRect(x, yy, boxW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(74, 120, 124);
    doc.text(pdfSafeText(label.toUpperCase()), x + 4, yy + 7);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 58, 64);
    doc.setFont('helvetica', 'normal');
    addWrappedText(doc, value, x + 4, yy + 13, boxW - 8, 4.2);
  });

  y += Math.ceil(infoBoxes.length / 2) * (boxH + 5) + 6;

  if (room) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(74, 120, 124);
    doc.text(pdfSafeText('THONG TIN PHONG'), margin, y);
    y += 7;

    const roomLines = [
      `Dien tich: ${room.area != null ? `${Number(room.area).toLocaleString('vi-VN')} m2` : '-'}`,
      `Tang: ${room.floor != null ? room.floor : '-'}`,
      `So nguoi toi da: ${room.max_tenants ?? '-'}`,
      `Gia niem yet: ${moneyPdf(room.price)}`,
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 58, 64);
    roomLines.forEach((line) => {
      doc.text(pdfSafeText(line), margin, y);
      y += 5;
    });
    if (room.description) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(74, 120, 124);
      doc.text(pdfSafeText('Mo ta:'), margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      y = addWrappedText(doc, room.description, margin, y, contentWidth, 4.5);
    }
    y += 4;
  }

  if (contract.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(74, 120, 124);
    doc.text(pdfSafeText('GHI CHU HOP DONG'), margin, y);
    y += 7;
    doc.setDrawColor(215, 236, 239);
    doc.setFillColor(255, 255, 255);
    const noteH = 22;
    doc.roundedRect(margin, y, contentWidth, noteH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 58, 64);
    addWrappedText(doc, contract.notes, margin + 4, y + 6, contentWidth - 8, 4.5);
    y += noteH + 8;
  }

  const assetRows = (assets || []).map((a, i) => [
    String(i + 1),
    pdfSafeText(a.name || '-'),
    String(a.quantity ?? 1),
    pdfSafeText(assetStatusPdf(a.status)),
    pdfSafeText(a.note?.trim() || '-'),
  ]);

  if (assetRows.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(74, 120, 124);
    doc.text(pdfSafeText('TAI SAN BAN GIAO'), margin, y);
    y += 4;

    autoTable(doc, {
      startY: y + 2,
      head: [[
        pdfSafeText('STT'),
        pdfSafeText('Ten tai san'),
        pdfSafeText('SL'),
        pdfSafeText('Trang thai'),
        pdfSafeText('Ghi chu'),
      ]],
      body: assetRows,
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 253, 253] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  const ruleItems = Array.isArray(rules) ? rules : [];
  if (ruleItems.length > 0) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(74, 120, 124);
    doc.text(pdfSafeText('DIEU KHOAN & QUY DINH'), margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 58, 64);

    ruleItems.forEach((rule) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(pdfSafeText(rule.title || ''), margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      y = addWrappedText(doc, rule.desc || '', margin, y, contentWidth, 4.2);
      y += 4;
    });
  }

  const footerY = pageHeight - 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 171, 176);
  doc.text(
    pdfSafeText('Tai lieu duoc xuat tu he thong quan ly phong tro The Sun. Vui long lien he ban quan ly neu can chinh sua.'),
    margin,
    footerY
  );

  const safeRoom = String(roomNumber).replace(/[^a-zA-Z0-9-]/g, '-');
  doc.save(`hop-dong-${contractNo.toLowerCase()}-phong-${safeRoom}.pdf`);
  return true;
}
