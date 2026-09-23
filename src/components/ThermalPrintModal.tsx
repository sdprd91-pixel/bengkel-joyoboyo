import React, { useState } from 'react';
import {
  X,
  Printer,
  Wrench,
  User,
  Calendar,
  FileText,
  CheckCircle,
  CreditCard,
  DollarSign,
  QrCode,
  Sparkles,
  FileDown,
  Share2,
  MessageCircle,
  Check,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Employee,
  PayrollRecord,
  ServiceOrder,
  ShopSettings,
} from '../types';
import { formatDateIndo, formatRupiah } from '../lib/storage';
import shopLogo from '../assets/images/joyoboyo_logo_1785722496730.jpg';

interface ThermalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  order?: ServiceOrder | null;
  payroll?: PayrollRecord | null;
  employee?: Employee | null;
  type?: 'RECEIPT' | 'WORK_ORDER' | 'PAYROLL_SLIP';
}

export const ThermalPrintModal: React.FC<ThermalPrintModalProps> = ({
  isOpen,
  onClose,
  settings,
  order,
  payroll,
  employee,
  type = 'RECEIPT',
}) => {
  // Read print configuration directly from global settings
  const paperWidth = settings.paperWidth || '58mm';
  const printWidthPreset = settings.printWidthPreset || (paperWidth === '80mm' ? '72mm' : '38mm');
  const printFontSize = settings.printFontSize || (paperWidth === '80mm' ? '11px' : '9px');
  const printAlign = settings.printAlign || 'center';
  const fontFamily = settings.fontFamily || 'mono';
  const leftMarginMm = settings.leftMarginMm || '0mm';
  const printScale = settings.printScale || '90%';

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [waToast, setWaToast] = useState<boolean>(false);
  const [printErrorNotice, setPrintErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate plain text format for POS-58 Bluetooth Thermal Printers (RawBT / ESC-POS)
  const generateRawBTText = (): string => {
    let text = '';
    const maxLen = paperWidth === '58mm' ? (printWidthPreset === '30mm' ? 28 : printWidthPreset === '32mm' ? 30 : 32) : 42;
    const divider = '-'.repeat(maxLen) + '\n';
    const doubleDivider = '='.repeat(maxLen) + '\n';

    const center = (str: string) => {
      const pad = Math.max(0, Math.floor((maxLen - str.length) / 2));
      return ' '.repeat(pad) + str + '\n';
    };

    const align2 = (left: string, right: string) => {
      const maxLeft = maxLen - right.length - 1;
      const trimmedLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
      const spaceNeeded = maxLen - trimmedLeft.length - right.length;
      return trimmedLeft + ' '.repeat(Math.max(1, spaceNeeded)) + right + '\n';
    };

    text += doubleDivider;
    text += center((settings.shopName || 'BENGKEL MOTOR').toUpperCase());
    if (settings.address) text += center(settings.address);
    if (settings.phone) text += center('TELP: ' + settings.phone);
    text += doubleDivider;

    if (order) {
      text += align2('No. Nota :', order.id);
      text += align2('Tanggal  :', order.createdAt);
      text += align2('Pelanggan:', (order.customerName || 'UMUM').slice(0, 18));
      text += align2('Plat No. :', order.plateNumber);
      if (order.motorModel) text += align2('Motor    :', order.motorModel.slice(0, 18));
      if (order.mechanicName) text += align2('Mekanik  :', order.mechanicName.slice(0, 18));
      text += divider;

      if (type === 'WORK_ORDER') {
        text += center('*** SPK / TIKET KERJA MEKANIK ***');
        text += divider;
      }

      if (order.labors.length > 0) {
        text += 'JASA SERVIS:\n';
        order.labors.forEach((item) => {
          text += item.name.slice(0, 32) + '\n';
          text += align2('  1x @' + item.price.toLocaleString('id-ID'), 'Rp ' + item.price.toLocaleString('id-ID'));
        });
      }

      if (order.parts.length > 0) {
        if (order.labors.length > 0) text += divider;
        text += 'SPAREPART / OLI:\n';
        order.parts.forEach((part) => {
          text += part.name.slice(0, 32) + '\n';
          const lineTotal = part.sellPrice * part.qty;
          text += align2(`  ${part.qty}x @${part.sellPrice.toLocaleString('id-ID')}`, 'Rp ' + lineTotal.toLocaleString('id-ID'));
        });
      }

      text += doubleDivider;
      text += align2('TOTAL    :', 'Rp ' + order.totalAmount.toLocaleString('id-ID'));
      const isPaid = order.paymentStatus === 'LUNAS' || order.status === 'LUNAS';
      const actualPaid = order.paidAmount !== undefined && order.paidAmount > 0
        ? order.paidAmount
        : (isPaid ? order.totalAmount : 0);
      const actualChange = order.changeAmount !== undefined && order.changeAmount >= 0
        ? order.changeAmount
        : (actualPaid >= order.totalAmount ? actualPaid - order.totalAmount : 0);

      if (isPaid) {
        text += align2('BAYAR    :', (order.paymentMethod || 'TUNAI') + ' Rp ' + actualPaid.toLocaleString('id-ID'));
        text += align2('KEMBALI  :', 'Rp ' + actualChange.toLocaleString('id-ID'));
        text += divider;
        text += center('STATUS: LUNAS');
      } else {
        if (actualPaid > 0) text += align2('DP/BAYAR :', 'Rp ' + actualPaid.toLocaleString('id-ID'));
        text += align2('SISA     :', 'Rp ' + Math.max(0, order.totalAmount - actualPaid).toLocaleString('id-ID'));
        text += divider;
        text += center('STATUS: BELUM LUNAS');
      }
    } else if (payroll) {
      text += center('SLIP GAJI & KOMISI');
      text += divider;
      text += align2('No. Slip :', payroll.id);
      text += align2('Karyawan :', payroll.employeeName);
      text += align2('Jabatan  :', payroll.employeeRole);
      text += align2('Periode  :', payroll.periodStart + ' - ' + payroll.periodEnd);
      text += divider;
      text += align2('Gaji Pokok :', 'Rp ' + payroll.totalBaseSalary.toLocaleString('id-ID'));
      text += align2('Komisi     :', 'Rp ' + payroll.totalCommission.toLocaleString('id-ID'));
      if (payroll.bonus) text += align2('Bonus/Tip  :', 'Rp ' + payroll.bonus.toLocaleString('id-ID'));
      if (payroll.deductions) text += align2('Potongan   :', '-Rp ' + payroll.deductions.toLocaleString('id-ID'));
      text += doubleDivider;
      text += align2('TOTAL GAJI :', 'Rp ' + payroll.netTotal.toLocaleString('id-ID'));
    }

    text += doubleDivider;
    if (settings.receiptFooterText) text += center(settings.receiptFooterText);
    text += center('Terima kasih atas kunjungan Anda');
    text += '\n\n\n\n\n';

    return text;
  };

  // 1. Open receipt in new dedicated print pop-up window
  const handlePrintInNewWindow = (): boolean => {
    const receiptElement = document.getElementById('printable-thermal-receipt');
    if (!receiptElement) return false;

    try {
      const printWin = window.open('', '_blank', 'width=480,height=700,scrollbars=yes');
      if (!printWin) {
        return false;
      }

      const parentStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join('\n');

      const targetWidthMm = paperWidth === '58mm' ? '58mm' : '80mm';
      const maxPrintWidth = paperWidth === '58mm' ? printWidthPreset : '72mm';
      const activeFontSize = paperWidth === '58mm' ? printFontSize : '11px';
      const activeFontStack = fontFamily === 'sans' 
        ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        : "'Courier New', Courier, monospace";
      const marginCss = printAlign === 'left'
        ? `0 auto 0 ${leftMarginMm}`
        : '0 auto';

      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${order ? 'Nota_' + order.id : 'Struk_Termal'}</title>
            ${parentStyles}
            <style>
              * {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @media print {
                .no-print, .no-print-bar { display: none !important; }
                html, body {
                  display: block !important;
                  position: static !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  width: 100% !important;
                  height: auto !important;
                  min-height: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                  -webkit-font-smoothing: antialiased !important;
                  -moz-osx-font-smoothing: grayscale !important;
                  text-rendering: optimizeLegibility !important;
                }
                @page { size: auto; margin: 0mm !important; }
                .receipt-wrapper {
                  display: block !important;
                  position: static !important;
                  width: 100% !important;
                  max-width: ${maxPrintWidth} !important;
                  margin: ${marginCss} !important;
                  padding: 0 0 30mm 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  background: #ffffff !important;
                  height: auto !important;
                  min-height: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                }
                #printable-thermal-receipt {
                  display: block !important;
                  position: relative !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: ${marginCss} !important;
                  padding: 0 0 30mm 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: ${activeFontStack} !important;
                  font-size: ${activeFontSize} !important;
                  font-weight: 700 !important;
                  line-height: 1.25 !important;
                  word-break: break-word !important;
                  overflow-wrap: break-word !important;
                  zoom: ${printScale === '90%' ? '0.9' : printScale === '85%' ? '0.85' : '1'} !important;
                  height: auto !important;
                  min-height: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                  page-break-inside: auto !important;
                  break-inside: auto !important;
                  page-break-after: auto !important;
                }
                #printable-thermal-receipt * {
                  color: #000000 !important;
                  -webkit-text-fill-color: #000000 !important;
                  border-color: #000000 !important;
                  font-weight: 700 !important;
                }
                #printable-thermal-receipt .bg-black,
                #printable-thermal-receipt .bg-black * {
                  background-color: #000000 !important;
                  color: #ffffff !important;
                  -webkit-text-fill-color: #ffffff !important;
                }
              }
              body {
                margin: 0;
                padding: 16px;
                background-color: #0f172a;
                font-family: 'Courier New', Courier, monospace;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
              }
              .no-print-bar {
                width: 100%;
                max-width: 340px;
                background: #1e293b;
                color: #ffffff;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 16px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                border: 1px solid #334155;
              }
              .btn-print {
                background: #f97316;
                color: #ffffff;
                border: none;
                padding: 10px 18px;
                font-size: 13px;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 8px;
                width: 100%;
                box-shadow: 0 2px 6px rgba(249, 115, 22, 0.4);
              }
              .btn-print:hover {
                background: #ea580c;
              }
              .receipt-wrapper {
                background: #ffffff;
                width: ${paperWidth === '58mm' ? (printWidthPreset === '30mm' ? '145px' : printWidthPreset === '32mm' ? '155px' : printWidthPreset === '35mm' ? '170px' : '185px') : '280px'};
                padding: 4px 4px 30px 4px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                border-radius: 4px;
                color: #000000;
              }
            </style>
          </head>
          <body>
            <div class="no-print no-print-bar">
              <div style="font-size: 13px; font-weight: bold; color: #fb923c;">🖨️ STRUK THERMAL READY</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Pilih printer POS-58 Anda pada dialog cetak browser.</div>
              <button class="btn-print" onclick="window.print()">Cetak Struk Sekarang (Ctrl+P)</button>
            </div>
            <div class="receipt-wrapper">
              <div id="printable-thermal-receipt" class="bg-white text-black font-mono" style="font-size: ${activeFontSize};">
                ${receiptElement.innerHTML}
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      return true;
    } catch (e) {
      console.error('Failed to open new print window', e);
      return false;
    }
  };

  // 2. Direct RawBT Bluetooth App trigger for Android POS-58
  const handleRawBTPrint = () => {
    const rawText = generateRawBTText();
    // RawBT Android intent format
    const rawbtUrl = 'intent://#Intent;scheme=rawbt;package=ru.a404.rawbtprinter;S.txt=' + encodeURIComponent(rawText) + ';end;';
    
    try {
      window.location.href = rawbtUrl;
    } catch (e) {
      console.error('RawBT launch error:', e);
    }

    // Fallback copy to clipboard
    navigator.clipboard?.writeText(rawText).then(() => {
      setPrintErrorNotice('Teks struk POS-58 disalin ke clipboard! Jika aplikasi RawBT tidak terbuka otomatis, paste langsung di aplikasi printer Bluetooth.');
      setTimeout(() => setPrintErrorNotice(null), 6000);
    }).catch(() => {});
  };

  // Main Print Handler
  const handlePrint = () => {
    setPrintErrorNotice(null);

    // Primary method: Open dedicated print window (bypasses iframe sandboxing)
    const successNewWin = handlePrintInNewWindow();
    if (successNewWin) return;

    // Fallback method: Hidden iframe or in-page print
    const receiptElement = document.getElementById('printable-thermal-receipt');
    if (!receiptElement) {
      window.print();
      return;
    }

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      const parentStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join('\n');

      const targetWidthMm = paperWidth === '58mm' ? '58mm' : '80mm';
      const maxPrintWidth = paperWidth === '58mm' ? printWidthPreset : '72mm';
      const activeFontSize = paperWidth === '58mm' ? printFontSize : '11px';
      const activeFontStack = fontFamily === 'sans' 
        ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
        : "'Courier New', Courier, monospace";
      const marginCss = printAlign === 'left'
        ? `0 auto 0 ${leftMarginMm}`
        : '0 auto';

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${order ? 'Nota_' + order.id : 'Struk_Termal'}</title>
            ${parentStyles}
            <style>
              * {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: auto;
                margin: 0mm !important;
              }
              html, body {
                display: block !important;
                position: static !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-rendering: optimizeLegibility !important;
              }
              #printable-thermal-receipt {
                display: block !important;
                position: relative !important;
                width: 100% !important;
                max-width: ${maxPrintWidth} !important;
                margin: ${marginCss} !important;
                padding: 0 0 30mm 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: ${activeFontStack} !important;
                font-size: ${activeFontSize} !important;
                font-weight: 700 !important;
                line-height: 1.25 !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                zoom: ${printScale === '90%' ? '0.9' : printScale === '85%' ? '0.85' : '1'} !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                page-break-inside: auto !important;
                break-inside: auto !important;
                page-break-after: auto !important;
              }
              #printable-thermal-receipt * {
                color: #000000 !important;
                -webkit-text-fill-color: #000000 !important;
                border-color: #000000 !important;
                font-weight: 700 !important;
              }
              #printable-thermal-receipt .bg-black,
              #printable-thermal-receipt .bg-black * {
                background-color: #000000 !important;
                color: #ffffff !important;
                -webkit-text-fill-color: #ffffff !important;
              }
            </style>
          </head>
          <body>
            <div id="printable-thermal-receipt" class="bg-white text-black font-mono">
              ${receiptElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print()', err);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 300);
    } catch (e) {
      console.error('Print error:', e);
      window.print();
    }
  };

  // Helper to capture exact thermal receipt as canvas/image with razor sharp 4x scale
  const generateThermalReceiptImage = async (): Promise<string | null> => {
    const receiptElement = document.getElementById('printable-thermal-receipt');
    if (!receiptElement) return null;
    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 4, // 4x Super High DPI resolution for razor sharp thermal receipt output
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Fix Tailwind v4 oklch incompatibility in html2canvas safely without turning background colors black
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          styleTags.forEach((style) => {
            if (style.textContent && style.textContent.includes('oklch')) {
              style.textContent = style.textContent
                .replace(/background(-color)?\s*:\s*oklch\([\s\S]*?\)/gi, 'background-color: #ffffff')
                .replace(/border(-color)?\s*:\s*oklch\([\s\S]*?\)/gi, 'border-color: #000000')
                .replace(/color\s*:\s*oklch\([\s\S]*?\)/gi, 'color: #000000')
                .replace(/oklch\([\s\S]*?\)/gi, '#000000');
            }
          });

          const allElements = Array.from(clonedDoc.querySelectorAll('*'));
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              const styleAttr = htmlEl.getAttribute('style');
              if (styleAttr && styleAttr.includes('oklch')) {
                htmlEl.setAttribute(
                  'style',
                  styleAttr
                    .replace(/background(-color)?\s*:\s*oklch\([\s\S]*?\)/gi, 'background-color: #ffffff')
                    .replace(/border(-color)?\s*:\s*oklch\([\s\S]*?\)/gi, 'border-color: #000000')
                    .replace(/color\s*:\s*oklch\([\s\S]*?\)/gi, 'color: #000000')
                    .replace(/oklch\([\s\S]*?\)/gi, '#000000')
                );
              }
            }
          });

          // Ensure cloned receipt element has clean white background and ultra sharp pure black text
            const clonedReceipt = clonedDoc.getElementById('printable-thermal-receipt');
          if (clonedReceipt) {
            clonedReceipt.style.backgroundColor = '#ffffff';
            clonedReceipt.style.color = '#000000';
            clonedReceipt.style.fontWeight = '700';
            clonedReceipt.style.boxShadow = 'none';
            clonedReceipt.style.paddingBottom = '32px';

            const children = clonedReceipt.querySelectorAll('*');
            children.forEach((child) => {
              const htmlEl = child as HTMLElement;
              const isDarkBadge = htmlEl.classList.contains('bg-black') || htmlEl.getAttribute('style')?.includes('background-color: #000000') || htmlEl.getAttribute('style')?.includes('background-color: black');
              if (isDarkBadge) {
                htmlEl.style.backgroundColor = '#000000';
                htmlEl.style.color = '#ffffff';
              } else {
                htmlEl.style.color = '#000000';
                htmlEl.style.borderColor = '#000000';
              }
              htmlEl.style.fontWeight = '700';
            });
          }
        },
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Error generating receipt image:', err);
      return null;
    }
  };

  // 2. Download Image (PNG format styled as thermal receipt)
  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await generateThermalReceiptImage();
      if (dataUrl) {
        const link = document.createElement('a');
        const fileName = order
          ? `Nota_${order.id}_${order.plateNumber.replace(/\s+/g, '_')}.png`
          : `Struk_Termal_${type}.png`;
        link.href = dataUrl;
        link.download = fileName;
        link.click();
      }
    } catch (err) {
      alert('Gagal mengunduh gambar nota termal.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Format Plain Text for WhatsApp or Clipboard
  const getPlainTextReceipt = (): string => {
    let text = `*${settings.shopName.toUpperCase()}*\n`;
    text += `${settings.shopTagline}\n`;
    text += `${settings.address}, ${settings.city}\n`;
    text += `Telp: ${settings.phone}\n`;
    text += `--------------------------------\n`;

    if (type === 'RECEIPT' && order) {
      text += `*NO. NOTA:* ${order.id}\n`;
      text += `*Tanggal:* ${formatDateIndo(order.updatedAt || order.createdAt)}\n`;
      text += `*Pelanggan:* ${order.customerName}\n`;
      text += `*Plat No:* ${order.plateNumber}\n`;
      text += `*Motor:* ${order.motorModel}\n`;
      text += `*Mekanik:* ${order.mechanicName}\n`;
      text += `--------------------------------\n`;

      if (order.labors.length > 0) {
        text += `*JASA SERVIS & PERBAIKAN:*\n`;
        order.labors.forEach((l) => {
          text += `• ${l.name}: ${formatRupiah(l.price)}\n`;
        });
      }

      if (order.parts.length > 0) {
        text += `\n*SPAREPART & SUKU CADANG:*\n`;
        order.parts.forEach((p) => {
          text += `• ${p.name} (${p.qty}x @${formatRupiah(p.sellPrice)}): ${formatRupiah(p.sellPrice * p.qty)}\n`;
        });
      }

      text += `--------------------------------\n`;
      text += `*TOTAL BAYAR: ${formatRupiah(order.totalAmount)}*\n`;
      text += `*Status:* ${order.paymentStatus}\n`;
      text += `--------------------------------\n`;
      text += `${settings.headerMessage}\n`;
      text += `${settings.footerMessage}\n`;
    } else if (type === 'WORK_ORDER' && order) {
      text += `*WORK ORDER / SPK BENGKEL*\n`;
      text += `Plat No: ${order.plateNumber} (${order.motorModel})\n`;
      text += `Pelanggan: ${order.customerName} (${order.customerPhone})\n`;
      text += `Mekanik: ${order.mechanicName}\n`;
      text += `Keluhan: ${order.complaint || 'Servis Rutin'}\n`;
    } else if (type === 'PAYROLL_SLIP' && payroll) {
      text += `*SLIP GAJI & KOMISI KARYAWAN*\n`;
      text += `Karyawan: ${payroll.employeeName}\n`;
      text += `Periode: ${payroll.periodStart} s/d ${payroll.periodEnd}\n`;
      text += `*TOTAL NET: ${formatRupiah(payroll.netTotal)}*\n`;
    }

    return text;
  };

  // 4. WhatsApp Share with Image & Text
  const handleSendWhatsApp = async () => {
    setIsGenerating(true);
    const dataUrl = await generateThermalReceiptImage();
    setIsGenerating(false);

    let phone = order?.customerPhone || '';
    phone = phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    // Try Web Share API (mobile devices)
    if (dataUrl && navigator.canShare && navigator.share) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const fileName = order
          ? `Nota_${order.id}_${order.plateNumber.replace(/\s+/g, '_')}.png`
          : `Struk_Termal_${type}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Struk Nota - ${settings.shopName}`,
            text: getPlainTextReceipt(),
          });
          return;
        }
      } catch (err) {
        console.log('Web share bypassed, downloading image');
      }
    }

    // Auto download image so user can easily attach it in WhatsApp
    if (dataUrl) {
      const link = document.createElement('a');
      const fileName = order
        ? `Nota_${order.id}_${order.plateNumber.replace(/\s+/g, '_')}.png`
        : `Struk_Termal_${type}.png`;
      link.href = dataUrl;
      link.download = fileName;
      link.click();

      setWaToast(true);
      setTimeout(() => setWaToast(false), 6000);
    }

    const text = getPlainTextReceipt();
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Non-Printable Modal Container */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[92vh] print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {type === 'RECEIPT' && 'Pratinjau Struk Servis / Nota'}
                {type === 'WORK_ORDER' && 'Tiket Kerja Mekanik (Work Order)'}
                {type === 'PAYROLL_SLIP' && 'Slip Gaji / Komisi Karyawan'}
              </h3>
              <p className="text-xs text-slate-400">Printer Termal Ready</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Printable Area Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex justify-center items-start print:p-0 print:bg-white">
          {/* Thermal Receipt Paper Effect */}
          <div
            id="printable-thermal-receipt"
            className={`bg-white text-black shadow-xl rounded-sm transition-all print:shadow-none print:m-0 print:p-0 print:w-full ${
              paperWidth === '80mm'
                ? 'w-[280px] max-w-[280px] p-3'
                : printWidthPreset === '28mm'
                ? 'w-[135px] max-w-[135px] p-1'
                : printWidthPreset === '30mm'
                ? 'w-[145px] max-w-[145px] p-1.5'
                : printWidthPreset === '32mm'
                ? 'w-[155px] max-w-[155px] p-1.5'
                : printWidthPreset === '35mm'
                ? 'w-[170px] max-w-[170px] p-2'
                : printWidthPreset === '38mm'
                ? 'w-[185px] max-w-[185px] p-2'
                : 'w-[210px] max-w-[210px] p-2'
            }`}
            style={{
              fontFamily: fontFamily === 'sans' 
                ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                : "'Courier New', Courier, monospace",
              fontSize: paperWidth === '58mm' ? printFontSize : '11px',
              lineHeight: '1.25',
              boxSizing: 'border-box',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {/* === 1. RECEIPT TYPE: SERVICE RECEIPT === */}
            {type === 'RECEIPT' && order && (
              <>
                {/* Header */}
                <div className="text-center pb-2 border-b-2 border-dashed border-black mb-2 text-black">
                  <div className="flex justify-center mb-1">
                    <img
                      src={settings.logoUrl || shopLogo}
                      alt={settings.shopName}
                      className="w-10 h-10 object-contain filter contrast-[300%] grayscale"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h2 className="font-black text-xs uppercase tracking-tight leading-tight text-black">
                    {settings.shopName}
                  </h2>
                  <p className="text-[9.5px] uppercase font-extrabold text-black leading-tight">
                    {settings.shopTagline}
                  </p>
                  <p className="text-[9.5px] mt-0.5 leading-tight font-bold text-black">{settings.address}</p>
                  <p className="text-[9.5px] leading-tight font-bold text-black">{settings.city} - Telp: {settings.phone}</p>
                </div>

                {/* Meta Information */}
                <div className="space-y-0.5 text-[9.5px] pb-2 border-b-2 border-dashed border-black mb-2 text-black font-bold">
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">No. Nota :</span>
                    <span className="font-extrabold text-right break-words flex-1 text-black">{order.id}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Tanggal  :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{formatDateIndo(order.updatedAt || order.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Pelanggan:</span>
                    <span className="font-extrabold uppercase text-right break-words flex-1 text-black">{order.customerName}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Plat No  :</span>
                    <span
                      className="font-black text-[10px] px-1 py-0.2 rounded border-2 border-black text-right shrink-0 bg-white text-black"
                    >
                      {order.plateNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Motor    :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{order.motorModel}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Mekanik  :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{order.mechanicName}</span>
                  </div>
                </div>

                {/* Items Section */}
                <div className="pb-2 border-b-2 border-dashed border-black mb-2 text-black">
                  {/* Labors / Services */}
                  {order.labors.length > 0 && (
                    <div className="mb-2">
                      <p className="font-black text-[9.5px] uppercase underline mb-1 text-black">
                        JASA SERVIS & PERBAIKAN
                      </p>
                      {order.labors.map((labor, i) => (
                        <div key={i} className="flex justify-between items-start gap-1 py-0.5 text-[9.5px]">
                          <span className="break-words flex-1 leading-tight font-bold text-black">{labor.name}</span>
                          <span className="font-extrabold whitespace-nowrap shrink-0 text-right ml-1 text-black">
                            {formatRupiah(labor.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spareparts */}
                  {order.parts.length > 0 && (
                    <div>
                      <p className="font-black text-[9.5px] uppercase underline mb-1 text-black">
                        SPAREPART & SUKU CADANG
                      </p>
                      {order.parts.map((part, i) => (
                        <div key={i} className="py-0.5 text-[9.5px]">
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-extrabold break-words flex-1 leading-tight text-black">{part.name}</span>
                            <span className="font-extrabold whitespace-nowrap shrink-0 text-right ml-1 text-black">
                              {formatRupiah(part.sellPrice * part.qty)}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold text-black">
                            {part.qty} x {formatRupiah(part.sellPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-0.5 text-[9.5px] pb-2 border-b-2 border-dashed border-black mb-2 text-black font-bold">
                  {order.labors.length > 0 && (
                    <div className="flex justify-between items-center gap-1">
                      <span className="shrink-0 font-bold">Subtotal Jasa:</span>
                      <span className="shrink-0 text-right font-bold text-black">{formatRupiah(order.subtotalLabor)}</span>
                    </div>
                  )}
                  {order.parts.length > 0 && (
                    <div className="flex justify-between items-center gap-1">
                      <span className="shrink-0 font-bold">Subtotal Part:</span>
                      <span className="shrink-0 text-right font-bold text-black">{formatRupiah(order.subtotalParts)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between items-center gap-1 font-bold text-black">
                      <span className="shrink-0">Diskon:</span>
                      <span className="shrink-0 text-right">-{formatRupiah(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-1 font-black text-[11px] pt-1 border-t-2 border-black text-black">
                    <span className="shrink-0">TOTAL BAYAR:</span>
                    <span className="shrink-0 text-right">{formatRupiah(order.totalAmount)}</span>
                  </div>
                  {(() => {
                    const isPaid = order.paymentStatus === 'LUNAS' || order.status === 'LUNAS';
                    const actualPaid = order.paidAmount !== undefined && order.paidAmount > 0
                      ? order.paidAmount
                      : (isPaid ? order.totalAmount : 0);
                    const actualChange = order.changeAmount !== undefined && order.changeAmount >= 0
                      ? order.changeAmount
                      : (actualPaid >= order.totalAmount ? actualPaid - order.totalAmount : 0);

                    if (isPaid) {
                      return (
                        <>
                          <div className="flex justify-between items-center gap-1 pt-0.5 text-black font-bold">
                            <span className="shrink-0">Bayar ({order.paymentMethod || 'TUNAI'}):</span>
                            <span className="shrink-0 text-right font-extrabold text-black">
                              {formatRupiah(actualPaid)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-1 text-black font-bold">
                            <span className="shrink-0">Kembalian:</span>
                            <span className="shrink-0 text-right font-black text-black text-[10.5px]">
                              {formatRupiah(actualChange)}
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <>
                          {actualPaid > 0 && (
                            <div className="flex justify-between items-center gap-1 pt-0.5 text-black font-bold">
                              <span className="shrink-0">DP / Bayar:</span>
                              <span className="shrink-0 text-right font-extrabold text-black">
                                {formatRupiah(actualPaid)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center gap-1 text-black font-bold">
                            <span className="shrink-0">Sisa Tagihan:</span>
                            <span className="shrink-0 text-right font-extrabold text-red-600 print:text-black">
                              {formatRupiah(Math.max(0, order.totalAmount - actualPaid))}
                            </span>
                          </div>
                        </>
                      );
                    }
                  })()}
                </div>

                {/* Status Pembayaran (Polos) */}
                <div className="text-center my-2 py-1 border-t border-b border-dashed border-black">
                  <p className="font-extrabold uppercase text-[10.5px] text-black tracking-wider">
                    STATUS: {order.paymentStatus === 'LUNAS' || order.status === 'LUNAS' ? '*** LUNAS ***' : '*** BELUM LUNAS ***'}
                  </p>
                </div>

                {/* Footer */}
                <div className="text-center pt-1 text-[9.5px] text-black font-bold space-y-0.5">
                  <p className="font-extrabold uppercase text-black">{settings.headerMessage}</p>
                  <p className="mt-0.5 font-bold text-black">{settings.footerMessage}</p>
                  <p className="mt-1.5 text-[9px] font-mono italic font-bold text-black">
                    -- Simpan nota ini sebagai bukti garansi --
                  </p>
                </div>
              </>
            )}

            {/* === 2. WORK ORDER TYPE: MECH TICKET === */}
            {type === 'WORK_ORDER' && order && (
              <>
                <div className="text-center pb-2 border-b-2 border-black mb-2 text-black">
                  <h2 className="font-black text-xs uppercase">{settings.shopName}</h2>
                  <p className="font-black text-[10px] uppercase border border-black py-0.5 mt-1 text-black bg-white">
                    PERINTAH KERJA BENGKEL
                  </p>
                </div>

                <div
                  className="text-center py-1.5 border-2 border-black rounded mb-2 bg-white text-black"
                >
                  <p className="text-[9.5px] text-black font-black uppercase">PLAT NOMOR MOTOR</p>
                  <p className="font-black text-lg text-black tracking-widest uppercase">
                    {order.plateNumber}
                  </p>
                  <p className="text-[10px] font-black text-black">{order.motorModel}</p>
                </div>

                <div className="space-y-0.5 text-[9.5px] pb-2 border-b-2 border-dashed border-black mb-2 text-black font-bold">
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">No. Tiket :</span>
                    <span className="font-extrabold text-right break-words flex-1 text-black">{order.id}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Pelanggan:</span>
                    <span className="font-extrabold text-right break-words flex-1 text-black">{order.customerName} ({order.customerPhone})</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Mekanik  :</span>
                    <span className="font-black underline text-right break-words flex-1 text-black">{order.mechanicName}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Waktu    :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{formatDateIndo(order.createdAt)}</span>
                  </div>
                </div>

                <div className="mb-3 text-black">
                  <p className="font-black text-[9.5px] uppercase underline mb-1">
                    KELUHAN PELANGGAN:
                  </p>
                  <p
                    className="text-[10px] font-bold p-1.5 border-2 border-black rounded font-mono bg-white text-black"
                  >
                    "{order.complaint || 'Servis rutin berkala'}"
                  </p>
                </div>

                <div className="mb-3 text-black">
                  <p className="font-black text-[9.5px] uppercase underline mb-1">
                    DAFTAR PENGERJAAN & PARTS:
                  </p>
                  <div className="space-y-1">
                    {order.labors.map((l, i) => (
                      <div key={i} className="flex items-center gap-1 text-[9.5px] font-bold text-black">
                        <span className="font-black">[  ]</span>
                        <span className="break-words flex-1">{l.name}</span>
                      </div>
                    ))}
                    {order.parts.map((p, i) => (
                      <div key={i} className="flex items-center gap-1 text-[9.5px] font-bold text-black">
                        <span className="font-black">[  ]</span>
                        <span className="break-words flex-1">{p.name} ({p.qty}x)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t-2 border-dashed border-black flex justify-between text-[9px] font-bold text-black">
                  <div className="text-center w-1/2">
                    <p>Mekanik</p>
                    <div className="h-6"></div>
                    <p className="font-black">({order.mechanicName})</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p>Penerima / Kasir</p>
                    <div className="h-6"></div>
                    <p className="font-black">(............)</p>
                  </div>
                </div>
              </>
            )}

            {/* === 3. PAYROLL SLIP TYPE === */}
            {type === 'PAYROLL_SLIP' && payroll && (
              <>
                <div className="text-center pb-2 border-b-2 border-dashed border-black mb-2 text-black">
                  <h2 className="font-black text-xs uppercase text-black">{settings.shopName}</h2>
                  <p className="text-[10px] uppercase font-black text-black">SLIP GAJI KARYAWAN</p>
                  <p className="text-[9px] font-bold text-black">{settings.city}</p>
                </div>

                <div className="space-y-0.5 text-[9.5px] pb-2 border-b-2 border-dashed border-black mb-2 text-black font-bold">
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">No. Slip  :</span>
                    <span className="font-extrabold text-right break-words flex-1 text-black">{payroll.id}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Karyawan  :</span>
                    <span className="font-black uppercase text-right break-words flex-1 text-black">{payroll.employeeName}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Jabatan   :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{payroll.employeeRole}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Periode   :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{payroll.periodStart} s/d {payroll.periodEnd}</span>
                  </div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="shrink-0 font-bold">Tgl Cair  :</span>
                    <span className="text-right break-words flex-1 font-bold text-black">{formatDateIndo(payroll.paidAt)}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[9.5px] pb-2 border-b-2 border-dashed border-black mb-2 text-black font-bold">
                  <div className="flex justify-between items-center gap-1">
                    <span className="shrink-0 font-bold">Hari Kerja ({payroll.daysWorked} hr):</span>
                    <span className="shrink-0 text-right font-bold text-black">{formatRupiah(payroll.totalBaseSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-1">
                    <span className="shrink-0 font-bold">Komisi Servis:</span>
                    <span className="font-extrabold text-black shrink-0 text-right">
                      +{formatRupiah(payroll.totalCommission)}
                    </span>
                  </div>
                  {payroll.bonus > 0 && (
                    <div className="flex justify-between items-center gap-1">
                      <span className="shrink-0 font-bold">Bonus / Tip:</span>
                      <span className="shrink-0 text-right font-bold text-black">+{formatRupiah(payroll.bonus)}</span>
                    </div>
                  )}
                  {payroll.deductions > 0 && (
                    <div className="flex justify-between items-center gap-1 text-black font-extrabold">
                      <span className="shrink-0">Potongan / Kasbon:</span>
                      <span className="shrink-0 text-right">-{formatRupiah(payroll.deductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-1 font-black text-[11px] pt-1 border-t-2 border-black text-black">
                    <span className="shrink-0">TOTAL DITERIMA:</span>
                    <span className="shrink-0 text-right">{formatRupiah(payroll.netTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-1 text-[9px] pt-0.5 font-bold text-black">
                    <span className="shrink-0">Metode Bayar:</span>
                    <span className="shrink-0 text-right">{payroll.paymentMethod}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between text-[9px] font-bold text-black">
                  <div className="text-center w-1/2">
                    <p>Diterima Oleh,</p>
                    <div className="h-6"></div>
                    <p className="font-black">({payroll.employeeName})</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p>Pemilik Bengkel,</p>
                    <div className="h-6"></div>
                    <p className="font-black border-b-2 border-black inline-block px-1">({settings.ownerName || 'Yuwanain'})</p>
                  </div>
                </div>
              </>
            )}

            {/* Safe Bottom Feed Buffer (Advances paper past physical cutter / tear-bar so footer, status, & kembalian are never cut) */}
            <div
              className="receipt-paper-feed pt-6 pb-2 text-center text-[9px] font-mono text-transparent select-none print:pt-8 print:pb-6 print:block"
              style={{ minHeight: '35px', lineHeight: '1.5' }}
              aria-hidden="true"
            >
              &nbsp;
            </div>
          </div>
        </div>

        {/* Notice alert for print status or copied RawBT text */}
        {printErrorNotice && (
          <div className="px-4 py-2 bg-amber-950/90 border-t border-amber-500/40 text-amber-200 text-xs font-medium flex items-center justify-between print:hidden animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{printErrorNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setPrintErrorNotice(null)}
              className="text-amber-400 hover:text-amber-200 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Toast notification when WhatsApp image is downloaded */}
        {waToast && (
          <div className="px-4 py-2 bg-emerald-950/90 border-t border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center justify-between print:hidden animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Gambar nota termal otomatis diunduh! Silakan lampirkan gambar tersebut di obrolan WhatsApp.</span>
            </span>
            <button
              onClick={() => setWaToast(false)}
              className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Action Buttons (Hidden on Print) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col gap-2.5 print:hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Tutup
            </button>

            <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={isGenerating}
                className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Kirim rincian nota & gambar termal via WhatsApp ke pelanggan"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5" />
                )}
                <span><span className="hidden sm:inline">Kirim</span> WA</span>
              </button>

              {/* Download PNG Thermal Image Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Unduh struk gambar format PNG presisi termal"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>Unduh Gambar (PNG)</span>
              </button>

              {/* Bluetooth Thermal App / RawBT Button */}
              <button
                type="button"
                onClick={handleRawBTPrint}
                disabled={isGenerating}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Cetak via aplikasi Bluetooth RawBT / POS-58"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak RawBT</span>
              </button>

              {/* Primary Thermal Printer Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                title="Cetak struk di jendela pop-up/browser"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Termal</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
