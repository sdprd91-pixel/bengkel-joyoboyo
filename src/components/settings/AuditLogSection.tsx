import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileText,
  X,
  Eye,
} from 'lucide-react';
import { AuditLog, UserAccount } from '../../types';
import { subscribeAuditLogs, fetchAllAuditLogs } from '../../services/auditService';
import { formatDateTimeJayapura } from '../../lib/timezone';

interface AuditLogSectionProps {
  currentUser?: UserAccount;
}

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoading(true);
    const unsubscribe = subscribeAuditLogs((incomingLogs) => {
      setLogs(incomingLogs);
      setIsLoading(false);
    }, 150);

    return () => unsubscribe();
  }, [isAdmin]);

  const modules = Array.from(new Set(['Semua', ...logs.map((l) => l.module).filter(Boolean)]));

  const filteredLogs = logs.filter((log) => {
    if (filterModule !== 'Semua' && log.module !== filterModule) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.documentId && log.documentId.toLowerCase().includes(q))
    );
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('CANCEL')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (action.includes('CREATE') || action.includes('RESTORE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('EDIT') || action.includes('ADJUSTMENT') || action.includes('ROLE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">
              Jejak Rekam Audit & Keamanan Sistem (Audit Trail)
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Immutable Log
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak setiap aktivitas transaksi, penyesuaian stok, pengeluaran kas, mutasi kasbon, dan perubahan data bengkel secara real-time.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
          Total Rekam: <strong>{filteredLogs.length}</strong> aktivitas
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas, nama pengguna, nota..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-orange-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold shrink-0">Filter Modul:</span>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px] sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-3">Waktu (WIT)</th>
              <th className="py-2.5 px-3">Pengguna</th>
              <th className="py-2.5 px-3">Aksi</th>
              <th className="py-2.5 px-3">Modul</th>
              <th className="py-2.5 px-3">Deskripsi Aktivitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                  {isLoading ? 'Memuat rekam jejak audit...' : 'Belum ada catatan aktivitas audit.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                    {formatDateTimeJayapura(l.timestamp)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-800">{l.userName}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono">{l.role}</div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadgeColor(
                        l.action
                      )}`}
                    >
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                    {l.module}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">
                    <div className="leading-relaxed">{l.description}</div>
                    {l.documentId && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref Doc: {l.documentId}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
