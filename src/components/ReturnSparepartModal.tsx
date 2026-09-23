import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Package,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  DollarSign,
  Printer,
  Calendar,
  User,
  ArrowRight,
  Info,
  Clock,
  History,
  FileText,
  Loader2,
} from 'lucide-react';
import { PaymentMethod, ReturnRecord, ServiceOrder, ShopSettings, Sparepart } from '../types';
import { formatDateIndo, formatRupiah, ProcessReturnInput, ProcessReturnResult } from '../lib/storage';

interface ReturnSparepartModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder | null;
  spareparts: Sparepart[];
  settings: ShopSettings;
  onProcessReturn: (input: ProcessReturnInput) => Promise<ProcessReturnResult> | ProcessReturnResult;
}

const COMMON_RETURN_REASONS = [
  'Salah Beli / Salah Tipe Barang',
  'Barang Cacat / Rusak / Bocor',
  'Kelebihan Beli / Sisa Proyek',
  'Pelanggan Batal Pakai / Tukar Unit',
  'Tidak Cocok dengan Motor Pelanggan',
  'Lainnya',
];

export const ReturnSparepartModal: React.FC<ReturnSparepartModalProps> = ({
  isOpen,
  onClose,
  order,
  spareparts,
  settings,
  onProcessReturn,
}) => {
  if (!isOpen || !order) return null;

  // Track return quantities and reasons per part
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('TUNAI');
  const [refundNotes, setRefundNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'FORM' | 'HISTORY'>('FORM');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Returnable items (parts with remaining qty > 0)
  const returnableItems = order.parts.map((p) => {
    const alreadyReturned = p.returnedQty || 0;
    const remainingQty = Math.max(0, p.qty - alreadyReturned);
    const masterPart = spareparts.find((sp) => sp.id === p.partId);
    return {
      ...p,
      alreadyReturned,
      remainingQty,
      masterStock: masterPart ? masterPart.stock : 0,
      masterUnit: masterPart?.unit || 'Pcs',
    };
  });

  const handleSetQty = (partId: string, qty: number, max: number) => {
    const validQty = Math.max(0, Math.min(max, qty));
    setReturnQtys((prev) => ({ ...prev, [partId]: validQty }));
    if (validQty > 0 && !returnReasons[partId]) {
      setReturnReasons((prev) => ({ ...prev, [partId]: COMMON_RETURN_REASONS[0] }));
    }
  };

  const handleSetAll = (partId: string, max: number) => {
    handleSetQty(partId, max, max);
  };

  const handleSetAllItems = () => {
    const newQtys: Record<string, number> = {};
    const newReasons: Record<string, string> = {};
    returnableItems.forEach((item) => {
      if (item.remainingQty > 0) {
        newQtys[item.partId] = item.remainingQty;
        newReasons[item.partId] = returnReasons[item.partId] || COMMON_RETURN_REASONS[0];
      }
    });
    setReturnQtys(newQtys);
    setReturnReasons(newReasons);
  };

  const handleClearAll = () => {
    setReturnQtys({});
  };

  // Check if current selection returns everything in order
  const isFullReturnSelection =
    returnableItems.length > 0 &&
    returnableItems.every((item) => (returnQtys[item.partId] || 0) === item.remainingQty && item.remainingQty > 0);

  // Calculate total refund
  const totalRefund = returnableItems.reduce((acc, item) => {
    const qtyToReturn = Number(returnQtys[item.partId]) || 0;
    return acc + item.sellPrice * qtyToReturn;
  }, 0);

  const totalItemsToReturn: number = Object.values(returnQtys).reduce<number>((acc, q) => acc + (Number(q) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);
    setSuccessAlert(null);

    const itemsToProcess = Object.entries(returnQtys)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([partId, qty]) => ({
        partId,
        qty: Number(qty),
        reason: returnReasons[partId] || 'Retur Penjualan',
      }));

    if (itemsToProcess.length === 0) {
      setErrorAlert('Pilih minimal 1 barang dengan jumlah retur lebih dari 0.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await onProcessReturn({
        orderId: order.id,
        items: itemsToProcess,
        returnItems: itemsToProcess,
        refundPaymentMethod: refundMethod,
        refundNotes: refundNotes.trim() || undefined,
        processedBy: 'Kasir Bengkel',
      });

      if (result.success) {
        setSuccessAlert(result.message);
        setReturnQtys({});
        setReturnReasons({});
        setRefundNotes('');
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorAlert(result.message);
      }
    } catch (err: any) {
      setErrorAlert(err?.message || 'Gagal memproses retur barang.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                Retur Barang Penjualan
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-orange-400 font-mono font-bold border border-slate-700">
                  {order.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kembalikan barang ke stok master inventaris dan catat pengembalian dana (refund).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Meta Header Info */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 text-slate-700">
            <span className="flex items-center gap-1 font-semibold">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <strong>{order.customerName}</strong> ({order.plateNumber})
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDateIndo(order.createdAt)}
            </span>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('FORM')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'FORM'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Retur
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-orange-500" />
              Riwayat Retur ({order.returnHistory?.length || 0})
            </button>
          </div>
        </div>

        {/* Alerts */}
        {successAlert && (
          <div className="m-4 mb-0 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successAlert}</span>
          </div>
        )}

        {errorAlert && (
          <div className="m-4 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorAlert}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'HISTORY' ? (
            <div className="space-y-3">
              {(!order.returnHistory || order.returnHistory.length === 0) ? (
                <div className="text-center py-10 text-slate-400">
                  <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">Belum ada riwayat retur untuk nota ini</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Semua transaksi retur yang diproses akan tercatat otomatis di sini.
                  </p>
                </div>
              ) : (
                order.returnHistory.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
                          {rec.id}
                        </span>
                        <span className="text-slate-500 font-semibold">
                          {formatDateIndo(rec.returnDate)}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Refund: {formatRupiah(rec.totalRefund)}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {rec.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          className="flex items-center justify-between text-slate-700 bg-white p-2 rounded-lg border border-slate-100"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{item.partName}</p>
                            <p className="text-[11px] text-slate-500">
                              Alasan: <span className="italic">{item.reason}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-orange-600">
                              {item.qty} unit
                            </span>
                            <p className="text-[10px] text-slate-400">
                              @{formatRupiah(item.sellPrice)} = {formatRupiah(item.refundSubtotal)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {rec.refundNotes && (
                      <p className="text-[11px] text-slate-500 bg-amber-50/60 p-2 rounded border border-amber-200/50">
                        <strong>Catatan:</strong> {rec.refundNotes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notice Banner */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-orange-950">
                <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Pilih barang dan masukkan <strong>jumlah yang diretur</strong>. Saat dikonfirmasi, <strong>stok di master inventaris sparepart akan otomatis bertambah kembali</strong> sesuai jumlah yang diretur.
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Daftar Sparepart dalam Nota ({returnableItems.length} item)
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetAllItems}
                      className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Pilih Semua (Retur Penuh)
                    </button>
                    {totalItemsToReturn > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {isFullReturnSelection && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Retur Penuh Terdeteksi:</strong>
                      Semua barang dalam nota ini dipilih untuk diretur. Setelah dikonfirmasi, seluruh stok akan dikembalikan dan status nota otomatis diubah menjadi <strong>BATAL / DIRETUR</strong> (tidak lagi masuk omzet aktif).
                    </div>
                  </div>
                )}

                {returnableItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-bold text-slate-600 text-xs">Tidak ada sparepart pada nota ini</p>
                  </div>
                ) : (
                  returnableItems.map((item) => {
                    const currentQty = returnQtys[item.partId] || 0;
                    const isFullyReturned = item.remainingQty === 0;
                    const previewNewStock = item.masterStock + currentQty;

                    return (
                      <div
                        key={item.partId}
                        className={`p-3.5 rounded-xl border transition-all ${
                          currentQty > 0
                            ? 'bg-orange-50/40 border-orange-300 shadow-xs'
                            : isFullyReturned
                            ? 'bg-slate-100/60 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Item Info */}
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </h5>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.code}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>
                                Harga: <strong>{formatRupiah(item.sellPrice)}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Dibeli: <strong>{item.qty} {item.masterUnit}</strong>
                              </span>
                              {item.alreadyReturned > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-semibold">
                                    Sudah diretur: {item.alreadyReturned}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className="text-slate-700 font-semibold">
                                Sisa bisa retur: <strong>{item.remainingQty} {item.masterUnit}</strong>
                              </span>
                            </div>

                            {/* Live Stock Impact Badge */}
                            <div className="pt-1 flex items-center gap-2 text-[11px]">
                              <span className="text-slate-500">
                                Stok Master Saat Ini: <strong>{item.masterStock}</strong>
                              </span>
                              {currentQty > 0 && (
                                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" />
                                  Menjadi: {previewNewStock} (+{currentQty} {item.masterUnit})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls */}
                          {!isFullyReturned ? (
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetQty(item.partId, currentQty - 1, item.remainingQty)}
                                  disabled={currentQty <= 0}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center font-bold transition-all cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <input
                                  type="number"
                                  min={0}
                                  max={item.remainingQty}
                                  value={currentQty}
                                  onChange={(e) =>
                                    handleSetQty(
                                      item.partId,
                                      parseInt(e.target.value) || 0,
                                      item.remainingQty
                                    )
                                  }
                                  className="w-14 text-center py-1 rounded-lg border border-slate-300 font-bold text-slate-800 text-sm focus:outline-none focus:border-orange-500"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleSetQty(item.partId, currentQty + 1, item.remainingQty)}
                                  disabled={currentQty >= item.remainingQty}
                                  className="w-8 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white flex items-center justify-center font-bold transition-all cursor-pointer shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetAll(item.partId, item.remainingQty)}
                                  className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer ml-1"
                                >
                                  Semua
                                </button>
                              </div>

                              {currentQty > 0 && (
                                <span className="font-mono font-bold text-xs text-orange-600">
                                  Refund: {formatRupiah(item.sellPrice * currentQty)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 font-bold text-[11px]">
                              Semua Sudah Diretur
                            </span>
                          )}
                        </div>

                        {/* Reason Selector when item is selected */}
                        {currentQty > 0 && (
                          <div className="mt-3 pt-3 border-t border-orange-200/70 flex flex-col sm:flex-row sm:items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-600 shrink-0">
                              Alasan Retur:
                            </label>
                            <select
                              value={returnReasons[item.partId] || COMMON_RETURN_REASONS[0]}
                              onChange={(e) =>
                                setReturnReasons((prev) => ({
                                  ...prev,
                                  [item.partId]: e.target.value,
                                }))
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                            >
                              {COMMON_RETURN_REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Refund Summary & Options */}
              {totalItemsToReturn > 0 && (
                <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Total Item Diretur:</span>
                    <span className="font-bold text-sm text-orange-400">
                      {totalItemsToReturn} unit sparepart
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-300 font-bold">
                      Total Pengembalian Dana (Refund):
                    </span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      {formatRupiah(totalRefund)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Metode Refund:
                      </label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="TUNAI">TUNAI (Cash)</option>
                        <option value="TRANSFER">TRANSFER BANK</option>
                        <option value="QRIS">QRIS</option>
                        <option value="DEBIT">KARTU DEBIT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Catatan Tambahan (Opsional):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Barang ditukar / salah ukuran..."
                        value={refundNotes}
                        onChange={(e) => setRefundNotes(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isProcessing || totalItemsToReturn === 0}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses Retur & Menambah Stok...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Konfirmasi Retur & Tambah Stok Masuk
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
