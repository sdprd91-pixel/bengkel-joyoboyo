import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  ShieldAlert,
  Archive,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { UserAccount } from '../../types';
import {
  exportFullDatabaseJSON,
  downloadBackupFile,
  restoreDatabaseFromJSON,
} from '../../services/backupService';
import { getJayapuraISOString, formatDateTimeJayapura } from '../../lib/timezone';

interface BackupRestoreSectionProps {
  currentUser?: UserAccount;
  onDataRestored?: () => void;
  onClearTransactions?: () => Promise<void> | void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  currentUser,
  onDataRestored,
  onClearTransactions,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 6000);
  };

  const handleClearTransactions = async () => {
    if (!isAdmin) {
      showStatus('Akses Terbatas: Hanya Admin yang berhak mengosongkan database penjualan & servis.', 'error');
      return;
    }

    if (
      !confirm(
        'PERINGATAN KOSONGKAN DATA:\n\nApakah Anda yakin ingin mengosongkan seluruh riwayat penjualan sparepart dan servis motor?\n\nKatalog sparepart, data pelanggan, pegawai, dan pengaturan bengkel TIDAK akan terhapus.\n\nData transaksi akan dimulai dari kosong (nol).'
      )
    ) {
      return;
    }

    setIsClearing(true);
    setStatusMsg(null);
    try {
      if (onClearTransactions) {
        await onClearTransactions();
      }
      showStatus('Database penjualan dan servis telah berhasil dikosongkan. Siap input dari awal!', 'success');
    } catch (err: any) {
      showStatus(`Gagal mengosongkan database: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setStatusMsg(null);
    try {
      const jsonString = await exportFullDatabaseJSON(currentUser);
      downloadBackupFile(jsonString);
      showStatus('File cadangan database (.JSON) berhasil diunduh ke komputer Anda.');
    } catch (err: any) {
      showStatus(`Gagal membuat backup: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      showStatus('Akses Terbatas: Hanya Admin yang berhak memulihkan (restore) database.', 'error');
      return;
    }

    if (
      !confirm(
        `PERINGATAN PEMULIHAN DATA:\n\nAnda akan memulihkan data dari file "${file.name}". Tindakan ini akan memperbarui dan menyinkronkan seluruh dokumen ke Cloud Firestore.\n\nApakah Anda yakin ingin melanjutkan?`
      )
    ) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    setRestoreProgress('Membaca dan memvalidasi file backup...');
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setRestoreProgress('Menyinkronkan dokumen ke Cloud Firestore...');
        const res = await restoreDatabaseFromJSON(content, currentUser!);

        showStatus(res.message, 'success');
        onDataRestored?.();
      } catch (err: any) {
        showStatus(`Gagal memulihkan database: ${err?.message || 'Format tidak valid'}`, 'error');
      } finally {
        setIsRestoring(false);
        setRestoreProgress(null);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      showStatus('Gagal membaca file backup dari komputer.', 'error');
      setIsRestoring(false);
      setRestoreProgress(null);
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-800 text-base">
              Cadangan & Pemulihan Database (Backup & Restore)
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
              JSON Full Dump
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ekspor seluruh koleksi database bengkel ke berkas JSON lokal atau pulihkan data dari berkas cadangan sebelumnya.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-red-50 border border-red-300 text-red-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card: Export Database */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Unduh Cadangan Database Lengkap</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mengekspor seluruh data bengkel (Inventaris sparepart, nota transaksi servis & kasir, pelanggan, pegawai, mutasi stok, dan pengaturan) ke dalam satu berkas terenkripsi standar JSON.
            </p>
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportBackup}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengekstrak Data...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Unduh File Backup JSON
              </>
            )}
          </button>
        </div>

        {/* Card: Restore Database */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Upload className="w-4 h-4 text-orange-600" />
              <span>Pulihkan Database dari File Cadangan</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unggah file JSON cadangan untuk memulihkan seluruh data. Data akan divalidasi dan disinkronkan langsung ke database Cloud Firestore.
            </p>
          </div>

          {isAdmin ? (
            <div>
              <label
                htmlFor="restore-file-input"
                className={`w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all ${
                  isRestoring ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    <span>{restoreProgress || 'Memproses Pemulihan...'}</span>
                  </>
                ) : (
                  <>
                    <FileJson className="w-4 h-4 text-orange-400" />
                    Pilih File JSON & Pulihkan Data
                  </>
                )}
              </label>
              <input
                id="restore-file-input"
                type="file"
                accept=".json,application/json"
                disabled={isRestoring}
                onChange={handleFileRestore}
                className="hidden"
              />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <span>Fitur pemulihan data hanya dapat dilakukan oleh Admin (Pemilik).</span>
            </div>
          )}
        </div>

        {/* Card: Reset / Clear Sales & Service Database */}
        <div className="p-5 rounded-2xl border border-red-200 bg-red-50/50 md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Kosongkan Database Penjualan & Servis (Mulai dari Nol)</span>
            </div>
            <p className="text-xs text-red-700 leading-relaxed">
              Menghapus seluruh antrean servis, riwayat pengerjaan, dan transaksi penjualan kasir (baik aktif maupun arsip) dari memori lokal dan Cloud Firestore. Master data sparepart, stok, daftar pelanggan, pegawai, dan pengaturan bengkel tetap utuh dan aman.
            </p>
          </div>

          {isAdmin ? (
            <button
              type="button"
              disabled={isClearing}
              onClick={handleClearTransactions}
              className="py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all shrink-0"
            >
              {isClearing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengosongkan...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Kosongkan Transaksi Sekarang
                </>
              )}
            </button>
          ) : (
            <div className="p-2 rounded-xl bg-white border border-red-200 text-red-600 font-semibold text-xs flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>Hanya Admin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
