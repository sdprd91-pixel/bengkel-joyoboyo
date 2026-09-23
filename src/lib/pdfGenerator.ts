import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Employee, PayrollRecord, ServiceOrder, ShopSettings } from '../types';
import { formatDateIndo, formatRupiah } from './storage';

/**
 * Generate Comprehensive Financial & Cash Flow PDF Report
 */
export function generateFinancialPDFReport(
  settings: ShopSettings,
  orders: ServiceOrder[],
  payrollRecords: PayrollRecord[],
  periodLabel: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.shopName || 'BENGKEL MOTOR JOYOBOYO YUWANA', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(settings.shopTagline || 'Spesialis Servis Injeksi & Sparepart', 14, 18);
  doc.text(`${settings.address}, ${settings.city} | Telp: ${settings.phone}`, 14, 24);

  // Title & Period
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LAPORAN KEUANGAN, LABA RUGI & ARUS KAS', 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode Laporan: ${periodLabel} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 48);

  // Financial Computations
  const lunasOrders = orders.filter((o) => o.paymentStatus === 'LUNAS');
  const totalOmzet = lunasOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalLabor = lunasOrders.reduce((acc, o) => acc + o.subtotalLabor, 0);
  const totalParts = lunasOrders.reduce((acc, o) => acc + o.subtotalParts, 0);
  const totalHPP = lunasOrders.reduce(
    (acc, o) => acc + o.parts.reduce((pAcc, p) => pAcc + (p.buyPrice || 0) * p.qty, 0),
    0
  );
  const totalCommission = lunasOrders.reduce((acc, o) => acc + (o.mechanicCommissionAmount || 0), 0);
  const totalGajiDisalurkan = payrollRecords.reduce((acc, p) => acc + p.netTotal, 0);
  const labaSertis = totalOmzet - totalHPP - totalCommission;

  // Key Financial KPIs Table
  autoTable(doc, {
    startY: 54,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    body: [
      ['Total Omzet Kotor (Pemasukan)', formatRupiah(totalOmzet), 'Total Beban HPP Sparepart', formatRupiah(totalHPP)],
      ['Pendapatan Jasa Servis', formatRupiah(totalLabor), 'Total Komisi Hak Mekanik', formatRupiah(totalCommission)],
      ['Pendapatan Penjualan Sparepart', formatRupiah(totalParts), 'Gaji Karyawan Dicairkan', formatRupiah(totalGajiDisalurkan)],
      ['ESTIMASI LABA BERSIH OPERASIONAL', formatRupiah(labaSertis), 'Margin Laba %', `${totalOmzet > 0 ? ((labaSertis / totalOmzet) * 100).toFixed(1) : 0}%`],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  // Cash Flow Inflow Breakdown Table (Payment Methods)
  const cashIn = lunasOrders.filter((o) => o.paymentMethod === 'TUNAI').reduce((a, o) => a + o.totalAmount, 0);
  const qrisIn = lunasOrders.filter((o) => o.paymentMethod === 'QRIS').reduce((a, o) => a + o.totalAmount, 0);
  const transferIn = lunasOrders.filter((o) => o.paymentMethod === 'TRANSFER').reduce((a, o) => a + o.totalAmount, 0);
  const debitIn = lunasOrders.filter((o) => o.paymentMethod === 'DEBIT').reduce((a, o) => a + o.totalAmount, 0);

  const lastY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Rincian Arus Kas Masuk & Metode Pembayaran:', 14, lastY);

  autoTable(doc, {
    startY: lastY + 3,
    theme: 'striped',
    head: [['Metode Pembayaran', 'Jumlah Transaksi', 'Total Penerimaan Kas']],
    body: [
      ['Tunai / Cash', lunasOrders.filter((o) => o.paymentMethod === 'TUNAI').length, formatRupiah(cashIn)],
      ['QRIS / Scan e-Wallet', lunasOrders.filter((o) => o.paymentMethod === 'QRIS').length, formatRupiah(qrisIn)],
      ['Transfer Bank / Mobile', lunasOrders.filter((o) => o.paymentMethod === 'TRANSFER').length, formatRupiah(transferIn)],
      ['Kartu Debit', lunasOrders.filter((o) => o.paymentMethod === 'DEBIT').length, formatRupiah(debitIn)],
    ],
    headStyles: { fillColor: [249, 115, 22] }, // Orange accent
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Detailed Transactions
  const nextY = (doc as any).lastAutoTable.finalY + 8;
  doc.text('Daftar Transaksi Servis Lunas Periode Ini:', 14, nextY);

  const tableRows = lunasOrders.map((o) => [
    o.id,
    o.completedAt ? formatDateIndo(o.completedAt) : formatDateIndo(o.createdAt),
    o.customerName,
    `${o.plateNumber} (${o.motorModel})`,
    formatRupiah(o.subtotalLabor),
    formatRupiah(o.subtotalParts),
    formatRupiah(o.totalAmount),
    o.paymentMethod || 'TUNAI',
  ]);

  autoTable(doc, {
    startY: nextY + 3,
    head: [['No. Nota', 'Tanggal', 'Pelanggan', 'Motor / Plat', 'Jasa', 'Part', 'Total', 'Bayar']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 7, cellPadding: 2 },
  });

  // Authorization Signature
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  if (finalY < 250) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${settings.city || 'Arso II'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 60, finalY);
    doc.text('Pemilik Bengkel,', pageWidth - 60, finalY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text(`( ${settings.ownerName || 'Yuwanain'} )`, pageWidth - 60, finalY + 22);
  }

  // Save PDF
  doc.save(`Laporan_Keuangan_Joyoboyo_${periodLabel.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generate Customer Service History PDF Log
 */
export function generateCustomerHistoryPDF(
  settings: ShopSettings,
  customer: Customer,
  orders: ServiceOrder[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.shopName, 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`${settings.address} | Telp: ${settings.phone}`, 14, 17);
  doc.text('REKAPITULASI RIWAYAT SERVIS MOTOR PELANGGAN', 14, 23);

  // Customer Profile Info Box
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`PROFIL PELANGGAN: ${customer.name.toUpperCase()}`, 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`ID Pelanggan : ${customer.id}`, 14, 42);
  doc.text(`No. WhatsApp : ${customer.phone}`, 14, 47);
  doc.text(`Alamat       : ${customer.address || 'Pati - Juwana'}`, 14, 52);
  doc.text(`Total Kunjungan : ${customer.totalVisits} kali  |  Total Transaksi : ${formatRupiah(customer.totalSpent)}`, 14, 57);

  // Registered Vehicles Table
  const vehicleRows = customer.vehicles.map((v) => [
    v.plateNumber,
    v.motorModel,
    v.lastServiceDate ? formatDateIndo(v.lastServiceDate) : '-',
    v.nextServiceDueDate ? formatDateIndo(v.nextServiceDueDate) : 'Perlu Diingatkan',
  ]);

  autoTable(doc, {
    startY: 62,
    theme: 'grid',
    head: [['Plat Nomor', 'Model Sepeda Motor', 'Servis Terakhir', 'Perkiraan Servis Berikutnya']],
    body: vehicleRows,
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Service Order Timeline Table
  const lastY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Riwayat Pengerjaan & Pemakaian Sparepart:', 14, lastY);

  const customerOrders = orders.filter(
    (o) => o.customerPhone === customer.phone || o.customerName.toLowerCase() === customer.name.toLowerCase()
  );

  const orderRows = customerOrders.map((o) => {
    const laborsStr = o.labors.map((l) => l.name).join(', ');
    const partsStr = o.parts.map((p) => `${p.name} (${p.qty})`).join(', ');
    return [
      o.id,
      formatDateIndo(o.createdAt),
      `${o.plateNumber} (${o.motorModel})`,
      `${laborsStr}${partsStr ? ' + ' + partsStr : ''}`,
      o.mechanicName,
      formatRupiah(o.totalAmount),
      o.paymentStatus,
    ];
  });

  autoTable(doc, {
    startY: lastY + 3,
    theme: 'striped',
    head: [['No. Nota', 'Tanggal', 'Unit Motor', 'Rincian Jasa & Sparepart', 'Mekanik', 'Total Biaya', 'Status']],
    body: orderRows.length > 0 ? orderRows : [['-', '-', '-', 'Belum ada riwayat servis tercatat', '-', 'Rp 0', '-']],
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 7, cellPadding: 2 },
  });

  doc.save(`Riwayat_Servis_${customer.name.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generate Payroll Slip PDF Document
 */
export function generatePayrollSlipPDF(
  settings: ShopSettings,
  payroll: PayrollRecord,
  employee?: Employee
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(settings.shopName || 'BENGKEL MOTOR JOYOBOYO YUWANAIN ARSO II', 10, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(settings.shopTagline || 'Spesialis Servis Injeksi, Tune Up & Sparepart', 10, 15);
  doc.text(`${settings.address}, ${settings.city} | Telp: ${settings.phone}`, 10, 20);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SLIP GAJI & KOMISI KARYAWAN', 10, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`No. Slip: ${payroll.id} | Tanggal Cair: ${formatDateIndo(payroll.paidAt)}`, 10, 40);

  // Employee Profile Table
  autoTable(doc, {
    startY: 44,
    theme: 'plain',
    body: [
      ['Nama Karyawan', ':', payroll.employeeName.toUpperCase(), 'Jabatan', ':', payroll.employeeRole],
      ['Periode Kerja', ':', `${payroll.periodStart} s/d ${payroll.periodEnd}`, 'Hari Kerja', ':', `${payroll.daysWorked} Hari`],
      ['Metode Bayar', ':', payroll.paymentMethod, 'Catatan', ':', payroll.notes || '-'],
    ],
    styles: { fontSize: 8, cellPadding: 1.2 },
  });

  const startY = (doc as any).lastAutoTable.finalY + 3;

  // Breakdown Table
  const bodyRows: any[] = [
    [`Gaji Pokok (${payroll.daysWorked} Hari)`, formatRupiah(payroll.totalBaseSalary)],
    ['Komisi Pengerjaan Jasa Servis Motor', `+${formatRupiah(payroll.totalCommission)}`],
  ];

  if (payroll.bonus > 0) {
    bodyRows.push(['Bonus / Tip Tambahan', `+${formatRupiah(payroll.bonus)}`]);
  }
  if (payroll.deductions > 0) {
    bodyRows.push(['Potongan / Kasbon', `-${formatRupiah(payroll.deductions)}`]);
  }

  bodyRows.push(['TOTAL GAJI & KOMISI DITERIMA (NETTO)', formatRupiah(payroll.netTotal)]);

  autoTable(doc, {
    startY: startY,
    theme: 'grid',
    head: [['Rincian Penerimaan & Potongan', 'Jumlah (Rp)']],
    body: bodyRows,
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // Left side: Employee
  doc.text('Diterima Oleh,', 15, finalY);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${payroll.employeeName} )`, 15, finalY + 16);

  // Right side: Owner from settings
  const dateStr = `${settings.city || 'Arso II'}, ${new Date(payroll.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, pageWidth - 55, finalY - 4);
  doc.text('Pemilik Bengkel,', pageWidth - 55, finalY);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.ownerName || 'Yuwanain'} )`, pageWidth - 55, finalY + 16);

  doc.save(`Slip_Gaji_${payroll.employeeName.replace(/\s+/g, '_')}_${payroll.id}.pdf`);
}

