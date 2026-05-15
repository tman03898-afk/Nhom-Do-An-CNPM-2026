import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Helvetica không hỗ trợ Unicode đầy đủ — chuyển sang ASCII an toàn cho PDF */
export function pdfSafeText(input) {
  let s = input == null ? '' : String(input);
  s = s.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s;
  }
}

function moneyPdf(v) {
  return Number(v || 0).toLocaleString('vi-VN');
}

function isPaidRow(status) {
  return String(status ?? '').toUpperCase() === 'PAID';
}

/** PAID trước; trong PAID sort theo ngày trả (payment_paid_at) tăng dần; chưa PAID theo hạn rồi invoice_id */
export function sortInvoiceRowsForPdf(rows) {
  const ts = (v) => {
    if (v == null || v === '') return null;
    const x = new Date(v).getTime();
    return Number.isNaN(x) ? null : x;
  };
  const dueTs = (r) => ts(r.due_date) ?? 0;

  return [...rows].sort((a, b) => {
    const ap = isPaidRow(a.status) ? 1 : 0;
    const bp = isPaidRow(b.status) ? 1 : 0;
    if (ap !== bp) return bp - ap;

    const da = ts(a.payment_paid_at);
    const db = ts(b.payment_paid_at);
    if (ap === 1 && bp === 1) {
      if (da != null && db != null && da !== db) return da - db;
      if (da == null && db != null) return 1;
      if (da != null && db == null) return -1;
      return (a.invoice_id || 0) - (b.invoice_id || 0);
    }

    return dueTs(a) - dueTs(b) || (a.invoice_id || 0) - (b.invoice_id || 0);
  });
}

function fmtPdfDate(isoOrDate) {
  if (isoOrDate == null || isoOrDate === '') return '—';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';
  return pdfSafeText(
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
}

/**
 * @param {object[]} rows — danh sách hóa đơn (đã lọc)
 * @param {{ filterSummary?: string, stats?: object }} meta
 */
export function exportInvoicesPdf(rows, meta = {}) {
  const summary = meta.filterSummary ?? '';
  const stats = meta.stats;
  const generatedAt = meta.generatedAt instanceof Date ? meta.generatedAt : new Date();

  const sorted = sortInvoiceRowsForPdf(rows);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.text(pdfSafeText('Danh sach hoa don'), 14, 14);
  doc.setFontSize(10);
  doc.text(pdfSafeText(`Bo loc: ${summary || '—'}`), 14, 20);
  doc.text(pdfSafeText(`Sap xep: PAID truoc, theo ngay tra`), 14, 25);
  doc.text(pdfSafeText(`Xuat luc: ${generatedAt.toLocaleString('vi-VN')}`), 14, 30);

  const body = sorted.map((i, idx) => [
    String(idx + 1),
    pdfSafeText(`${String(i.period_month).padStart(2, '0')}/${i.period_year}`),
    pdfSafeText(i.room_number ?? '—'),
    pdfSafeText(i.full_name ?? '—'),
    fmtPdfDate(i.payment_paid_at),
    moneyPdf(i.electricity_amount),
    moneyPdf(i.water_amount),
    moneyPdf(i.total_amount),
    pdfSafeText(String(i.status ?? '')),
  ]);

  autoTable(doc, {
    startY: 36,
    head: [
      [
        pdfSafeText('STT'),
        pdfSafeText('Ky'),
        pdfSafeText('Phong'),
        pdfSafeText('Khach hang'),
        pdfSafeText('Ngay tra'),
        pdfSafeText('Tien dien'),
        pdfSafeText('Tien nuoc'),
        pdfSafeText('Tong tien'),
        pdfSafeText('Trang thai'),
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.4, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 88, 96], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { cellWidth: 18 },
      2: { cellWidth: 14 },
      3: { cellWidth: 34 },
      4: { cellWidth: 22 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 24 },
      7: { halign: 'right', cellWidth: 28 },
      8: { cellWidth: 20 },
    },
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
    showHead: 'everyPage',
  });

  let y = doc.lastAutoTable && typeof doc.lastAutoTable.finalY === 'number' ? doc.lastAutoTable.finalY : 46;
  if (stats && typeof stats === 'object') {
    doc.setFontSize(9);
    const lines = [
      pdfSafeText(`So dong: ${sorted.length}`),
      pdfSafeText(`Da thu (PAID): ${moneyPdf(stats.totalCollected)} VND`),
      pdfSafeText(`Con lai phai thu: ${moneyPdf(stats.totalOutstanding)} VND`),
      pdfSafeText(`Tong phat hanh: ${moneyPdf(stats.totalBilled)} VND`),
    ];
    lines.forEach((line, i) => {
      doc.text(line, 14, y + 6 + i * 5);
    });
  }

  const stamp = generatedAt.toISOString().slice(0, 10);
  doc.save(`hoa-don-${stamp}-${Date.now().toString(36)}.pdf`);
}
