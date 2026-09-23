import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  PlusCircle,
  MinusCircle,
  X,
  Tag,
  MapPin,
  TrendingUp,
  DollarSign,
  Layers,
  QrCode,
  Zap,
  Sparkles,
  ImageIcon,
  Upload,
  Link as LinkIcon,
  Grid,
  List,
  Eye,
  Camera,
} from 'lucide-react';
import { Sparepart, SparepartCategory } from '../types';
import { formatRupiah } from '../lib/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface SparepartInventoryViewProps {
  spareparts: Sparepart[];
  onSaveSparepart: (part: Sparepart) => void;
  onDeleteSparepart: (id: string) => void;
  onAdjustStock: (partId: string, delta: number) => void;
}

const CATEGORIES: (SparepartCategory | 'Semua' | 'Stok Menipis')[] = [
  'Semua',
  'Stok Menipis',
  'Oli & Pelumas',
  'Ban & Ban Dalam',
  'Rem & Kopling',
  'Kelistrikan & Busi',
  'Rantai & Gir',
  'Mesin & Injeksi',
  'Aksesoris & CVT',
  'Lainnya',
];

const PRESET_SPAREPART_IMAGES = [
  { name: 'Oli Botol', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=300&auto=format&fit=crop&q=80' },
  { name: 'Oli Matic', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80' },
  { name: 'Kampas Rem', url: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=300&auto=format&fit=crop&q=80' },
  { name: 'Ban Motor', url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=300&auto=format&fit=crop&q=80' },
  { name: 'Busi / Part', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80' },
  { name: 'Aki Motor', url: 'https://images.unsplash.com/photo-1558441719-67710c818820?w=300&auto=format&fit=crop&q=80' },
];

export const SparepartInventoryView: React.FC<SparepartInventoryViewProps> = ({
  spareparts,
  onSaveSparepart,
  onDeleteSparepart,
  onAdjustStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [zoomedImage, setZoomedImage] = useState<{ name: string; url: string } | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Sparepart | null>(null);

  // Modal State for Restock Adjustment
  const [adjustPart, setAdjustPart] = useState<Sparepart | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);

  // Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<'SEARCH' | 'FORM'>('SEARCH');

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SparepartCategory>('Oli & Pelumas');
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(3);
  const [rackLocation, setRackLocation] = useState('Rak A-01');
  const [unit, setUnit] = useState('Botol');
  const [supplier, setSupplier] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputTab, setImageInputTab] = useState<'file' | 'url' | 'preset'>('file');

  const resetForm = () => {
    setEditingPart(null);
    setCode('');
    setName('');
    setCategory('Oli & Pelumas');
    setBuyPrice(0);
    setSellPrice(0);
    setWholesalePrice(0);
    setStock(10);
    setMinStock(3);
    setRackLocation('Rak A-01');
    setUnit('Botol');
    setSupplier('');
    setImageUrl('');
  };

  const handleOpenScanForSearch = () => {
    setScanTarget('SEARCH');
    setIsScannerOpen(true);
  };

  const handleOpenScanForForm = () => {
    setScanTarget('FORM');
    setIsScannerOpen(true);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const clean = scannedCode.trim().toUpperCase();
    if (scanTarget === 'FORM') {
      setCode(clean);
      setIsScannerOpen(false);
    } else {
      setSearchTerm(clean);
      const matched = spareparts.find(
        (p) => p.code.toUpperCase() === clean || p.id.toUpperCase() === clean
      );
      if (matched) {
        setSelectedCategory('Semua');
        setIsScannerOpen(false);
      } else {
        if (
          window.confirm(
            `Barcode "${clean}" belum terdaftar. Apakah Anda ingin mendaftarkan sparepart baru dengan kode ini?`
          )
        ) {
          resetForm();
          setCode(clean);
          setIsScannerOpen(false);
          setIsModalOpen(true);
        }
      }
    }
  };

  const handleGenerateAutoBarcode = () => {
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    setCode(`889${randomDigits}`);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran gambar terlalu besar! Maksimal 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(dataUrl);
        } else {
          setImageUrl(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (part: Sparepart) => {
    setEditingPart(part);
    setCode(part.code);
    setName(part.name);
    setCategory(part.category);
    setBuyPrice(part.buyPrice);
    setSellPrice(part.sellPrice);
    setWholesalePrice(part.wholesalePrice || Math.round(part.sellPrice * 0.9));
    setStock(part.stock);
    setMinStock(part.minStock);
    setRackLocation(part.rackLocation);
    setUnit(part.unit);
    setSupplier(part.supplier || '');
    setImageUrl(part.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !code.trim()) {
      alert('Mohon isi Kode dan Nama Sparepart!');
      return;
    }

    const partId = editingPart?.id || `SP-${Date.now()}`;

    const newPart: Sparepart = {
      id: partId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      buyPrice: Number(buyPrice),
      sellPrice: Number(sellPrice),
      wholesalePrice: Number(wholesalePrice) || Math.round(Number(sellPrice) * 0.9),
      stock: Number(stock),
      minStock: Number(minStock),
      rackLocation: rackLocation.trim() || 'Rak A-01',
      unit: unit.trim() || 'Pcs',
      supplier: supplier.trim() || '-',
      imageUrl: imageUrl.trim() || undefined,
      lastUpdated: new Date().toISOString(),
    };

    onSaveSparepart(newPart);
    setIsModalOpen(false);
    resetForm();
  };

  // Restock Submit
  const handleConfirmAdjust = () => {
    if (!adjustPart || adjustAmount === 0) return;
    onAdjustStock(adjustPart.id, adjustAmount);
    setAdjustPart(null);
  };

  // Filter Parts
  const filteredParts = spareparts.filter((part) => {
    const matchSearch =
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.rackLocation.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedCategory === 'Semua') return matchSearch;
    if (selectedCategory === 'Stok Menipis') {
      return matchSearch && part.stock <= part.minStock;
    }
    return matchSearch && part.category === selectedCategory;
  });

  // Calculate Inventaris Totals
  const totalBuyValuation = spareparts.reduce((acc, p) => acc + p.buyPrice * p.stock, 0);
  const totalSellValuation = spareparts.reduce((acc, p) => acc + p.sellPrice * p.stock, 0);
  const lowStockCount = spareparts.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-5 rounded-xl border border-slate-700 shadow-sm text-white">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-400" />
            Inventaris & Gudang Sparepart
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Manajemen persediaan oli, sparepart, harga HPP, lokasi rak & peringatan stok.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenScanForSearch}
            className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm flex items-center gap-2 border border-slate-600 shadow-sm transition-all cursor-pointer"
          >
            <QrCode className="w-5 h-5 text-orange-400" />
            Scan Barcode
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Tambah Sparepart Baru
          </button>
        </div>
      </div>

      {/* Summary Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Variasi Part</span>
            <p className="text-lg font-bold text-slate-800">{spareparts.length} Item</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Nilai Aset Modal (HPP)</span>
            <p className="text-lg font-bold text-emerald-600">{formatRupiah(totalBuyValuation)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 border-l-4 border-l-red-500">
          <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Stok Kritis / Menipis</span>
            <p className="text-lg font-bold text-red-600">{lowStockCount} Item Perlu Restock</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kode / Nama / Scan Barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 transition-colors uppercase"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenScanForSearch}
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            <QrCode className="w-4 h-4" /> Scan
          </button>

          {/* View Mode Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Galeri Gambar"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Katalog Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Tabel Detail"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto scrollbar-none py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat === 'Stok Menipis' ? '⚠️ Stok Menipis' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Spareparts Display: GRID vs TABLE */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredParts.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-slate-600">Tidak ada sparepart ditemukan</p>
            </div>
          ) : (
            filteredParts.map((part) => {
              const isLowStock = part.stock <= part.minStock;

              return (
                <div
                  key={part.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  {/* Image Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt={part.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <ImageIcon className="w-12 h-12 stroke-[1.5] text-slate-300 mb-1" />
                        <span className="text-[10px] font-semibold text-slate-400">Belum ada foto</span>
                      </div>
                    )}

                    {/* Code Badge */}
                    <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-amber-300 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-slate-700 shadow-xs">
                      {part.code}
                    </span>

                    {/* Stock Alert Badge */}
                    <span
                      className={`absolute top-2 right-2 text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-xs ${
                        isLowStock
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      Stok: {part.stock} {part.unit}
                    </span>

                    {/* Quick Zoom Button */}
                    {part.imageUrl && (
                      <button
                        onClick={() => setZoomedImage({ name: part.name, url: part.imageUrl! })}
                        className="absolute bottom-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
                        title="Perbesar Foto"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded mb-1.5">
                        {part.category}
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug mb-2">
                        {part.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Rak: <strong className="text-slate-700">{part.rackLocation}</strong></span>
                      </div>
                    </div>

                    {/* Pricing & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Ecer:</span>
                          <span className="font-mono font-black text-emerald-600 text-sm">
                            {formatRupiah(part.sellPrice)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-purple-600 font-bold uppercase bg-purple-50 px-1 rounded">Grosir:</span>
                          <span className="font-mono font-bold text-purple-700 text-xs">
                            {formatRupiah(part.wholesalePrice || Math.round(part.sellPrice * 0.9))}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setAdjustPart(part);
                            setAdjustAmount(10);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Restock Part"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(part)}
                          className="p-1.5 bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus sparepart ${part.name}?`)) {
                              onDeleteSparepart(part.id);
                            }
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Spareparts Table View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Foto</th>
                  <th className="py-3.5 px-4">Kode & Nama Part</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Lokasi Rak</th>
                  <th className="py-3.5 px-4 text-right">Harga Beli</th>
                  <th className="py-3.5 px-4 text-right text-emerald-700">Harga Ecer</th>
                  <th className="py-3.5 px-4 text-right text-purple-700">Harga Grosir</th>
                  <th className="py-3.5 px-4 text-center">Stok Gudang</th>
                  <th className="py-3.5 px-4 text-center">Aksi & Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Package className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="font-bold text-slate-600">Tidak ada sparepart ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  filteredParts.map((part) => {
                    const isLowStock = part.stock <= part.minStock;

                    return (
                      <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {part.imageUrl ? (
                              <img
                                src={part.imageUrl}
                                alt={part.name}
                                className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => setZoomedImage({ name: part.name, url: part.imageUrl! })}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 inline-block mb-1">
                            {part.code}
                          </span>
                          <p className="font-bold text-slate-800 text-sm">{part.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Supplier: {part.supplier || '-'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {part.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {part.rackLocation}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                          {formatRupiah(part.buyPrice)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                          {formatRupiah(part.sellPrice)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700 text-sm">
                          {formatRupiah(part.wholesalePrice || Math.round(part.sellPrice * 0.9))}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-lg font-mono font-bold text-xs ${
                              isLowStock
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {part.stock} {part.unit}
                          </span>
                          {isLowStock && (
                            <span className="block text-[9px] text-red-600 font-bold mt-1">
                              Min: {part.minStock} {part.unit}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Restock Button */}
                            <button
                              onClick={() => {
                                setAdjustPart(part);
                                setAdjustAmount(10);
                              }}
                              title="+ Tambah Stok (Restock)"
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Restock
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(part)}
                              title="Edit Sparepart"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => {
                                if (confirm(`Hapus sparepart ${part.name}?`)) {
                                  onDeleteSparepart(part.id);
                                }
                              }}
                              title="Hapus"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT SPAREPART                            */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">
                    {editingPart ? 'Edit Sparepart' : 'Tambah Sparepart Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Kelola harga HPP, harga jual & persediaan</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Kode Part / Barcode <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleOpenScanForForm}
                        className="text-[10px] text-orange-400 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        <QrCode className="w-3 h-3" /> Scan Kamera
                      </button>
                      <span className="text-slate-600 text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={handleGenerateAutoBarcode}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        <Zap className="w-3 h-3" /> Auto Barcode
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: OLI-MPX2-800 atau Scan Barcode"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Kategori <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SparepartCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200"
                  >
                    {CATEGORIES.filter((c) => c !== 'Semua' && c !== 'Stok Menipis').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Nama Sparepart <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Oli AHM MPX2 Matic 0.8 Liter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Harga Beli / HPP (Rp):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={buyPrice === 0 ? '' : buyPrice}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setBuyPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Harga Jual Ecer (Rp):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sellPrice === 0 ? '' : sellPrice}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const newSell = e.target.value === '' ? 0 : Number(e.target.value);
                      setSellPrice(newSell);
                      if (wholesalePrice === 0 || wholesalePrice === Math.round(sellPrice * 0.9)) {
                        setWholesalePrice(Math.round(newSell * 0.9));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-purple-400 block">
                      Harga Grosir (Rp):
                    </label>
                    <button
                      type="button"
                      onClick={() => setWholesalePrice(Math.round(sellPrice * 0.9))}
                      className="text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold"
                    >
                      -10% dari Ecer
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={wholesalePrice === 0 ? '' : wholesalePrice}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setWholesalePrice(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-purple-300 focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Stok Saat Ini:
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stock === 0 ? '' : stock}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setStock(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Minimal Stok Alert:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minStock === 0 ? '' : minStock}
                    placeholder="1"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setMinStock(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-red-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Satuan Unit:
                  </label>
                  <input
                    type="text"
                    placeholder="Botol / Pcs / Set"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100"
                  />
                </div>
              </div>

              {/* Foto / Gambar Sparepart Section */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-orange-400" />
                    Foto / Gambar Sparepart (Memudahkan Kasir)
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                {/* Input Method Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setImageInputTab('file')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      imageInputTab === 'file'
                        ? 'bg-slate-800 text-amber-400 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Kamera / File HP
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputTab('url')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      imageInputTab === 'url'
                        ? 'bg-slate-800 text-amber-400 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> URL Web
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputTab('preset')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      imageInputTab === 'preset'
                        ? 'bg-slate-800 text-amber-400 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Contoh Foto
                  </button>
                </div>

                {/* File Upload Tab */}
                {imageInputTab === 'file' && (
                  <div>
                    <label className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition-colors text-center group">
                      <Camera className="w-6 h-6 text-slate-400 group-hover:text-orange-400 mb-1" />
                      <span className="text-xs font-bold text-slate-200">
                        Ambil Foto Kamera / Pilih File
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Format JPG, PNG, WEBP (Otomatis Kompres)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* URL Tab */}
                {imageInputTab === 'url' && (
                  <div>
                    <input
                      type="url"
                      placeholder="https://domain.com/foto-sparepart.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100"
                    />
                  </div>
                )}

                {/* Preset Tab */}
                {imageInputTab === 'preset' && (
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_SPAREPART_IMAGES.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => setImageUrl(preset.url)}
                        className={`p-1.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          imageUrl === preset.url
                            ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <span className="text-[10px] font-bold line-clamp-1">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Live Preview */}
                {imageUrl && (
                  <div className="pt-2 flex items-center gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-emerald-400 block">
                        ✓ Foto Terpasang
                      </span>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{imageUrl}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Lokasi Rak Gudang:
                  </label>
                  <input
                    type="text"
                    placeholder="Rak A-02 / Gudang Ban"
                    value={rackLocation}
                    onChange={(e) => setRackLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Distributor / Supplier:
                  </label>
                  <input
                    type="text"
                    placeholder="AHM Pati / Distributor FDR"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingPart ? 'Simpan Perubahan Part' : 'Simpan Sparepart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK RESTOCK ADJUSTMENT                           */}
      {/* ========================================================= */}
      {adjustPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-sm w-full text-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm">
                Restock Sparepart: {adjustPart.name}
              </h3>
              <button onClick={() => setAdjustPart(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-center">
                <span className="text-slate-400 block">Stok Saat Ini:</span>
                <span className="font-mono font-black text-amber-400 text-xl">
                  {adjustPart.stock} {adjustPart.unit}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Jumlah Tambah Stok:
                </label>
                <input
                  type="number"
                  value={adjustAmount === 0 ? '' : adjustAmount}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAdjustAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono font-black text-center text-lg text-emerald-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAdjustPart(null)}
                  className="w-1/3 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAdjust}
                  className="w-2/3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Konfirmasi Restock (+{adjustAmount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={
          scanTarget === 'FORM'
            ? 'Scan Barcode ke Form Sparepart'
            : 'Scan Barcode Cari Sparepart'
        }
        subtitle="Gunakan kamera HP / webcam atau hubungkan Scanner USB Barcode"
      />

      {/* Lightbox / Zoomed Image Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full text-white shadow-2xl relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-100">{zoomedImage.name}</h4>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.name}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
