import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  DollarSign,
  Package,
  User,
  Phone,
  Tag,
  AlertCircle,
  Zap,
  ImageIcon,
  Maximize2,
  Minimize2,
  Store,
  Building2,
  Check,
} from 'lucide-react';
import { ServiceOrder, ServiceSparepartItem, ShopSettings, Sparepart, WholesaleCustomer } from '../types';
import { formatRupiah, getWholesaleCustomers } from '../lib/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface DirectSparepartSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  spareparts: Sparepart[];
  settings: ShopSettings;
  onCompleteSale: (order: ServiceOrder) => void;
  preselectedWholesaleCustomer?: WholesaleCustomer | null;
}

export const DirectSparepartSaleModal: React.FC<DirectSparepartSaleModalProps> = ({
  isOpen,
  onClose,
  spareparts,
  settings,
  onCompleteSale,
  preselectedWholesaleCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Price Mode: 'ECER' (Retail) vs 'GROSIR' (Wholesale)
  const [priceMode, setPriceMode] = useState<'ECER' | 'GROSIR'>('ECER');

  // Wholesale Customer selection
  const [wholesaleCustomersList, setWholesaleCustomersList] = useState<WholesaleCustomer[]>([]);
  const [selectedWholesaleId, setSelectedWholesaleId] = useState<string>('');

  // Cart state
  const [cartItems, setCartItems] = useState<
    (ServiceSparepartItem & { maxStock: number; priceType: 'ECER' | 'GROSIR' })[]
  >([]);

  // Customer info
  const [customerName, setCustomerName] = useState('Pembeli Langsung');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number>(0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS' | 'TRANSFER' | 'DEBIT'>('TUNAI');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isTempo, setIsTempo] = useState<boolean>(false);
  const future14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState<string>(future14Days);
  const [notes, setNotes] = useState('');

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanAlert, setScanAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Maximize / Minimize toggle
  const [isMaximized, setIsMaximized] = useState(false);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const list = getWholesaleCustomers();
      setWholesaleCustomersList(list);

      setCartItems([]);
      setPaidAmount(0);
      setNotes('');
      setSearchTerm('');

      if (preselectedWholesaleCustomer) {
        setPriceMode('GROSIR');
        setSelectedWholesaleId(preselectedWholesaleCustomer.id);
        setCustomerName(preselectedWholesaleCustomer.name);
        setCustomerPhone(preselectedWholesaleCustomer.phone);
        setDiscount(0);
      } else {
        setPriceMode('ECER');
        setSelectedWholesaleId('');
        setCustomerName('Pembeli Langsung');
        setCustomerPhone('');
        setDiscount(0);
      }
    }
  }, [isOpen, preselectedWholesaleCustomer]);

  // Auto-sync discount if selected wholesale customer has discountPercent
  useEffect(() => {
    if (selectedWholesaleId) {
      const found = wholesaleCustomersList.find((w) => w.id === selectedWholesaleId);
      if (found && typeof found.discountPercent === 'number' && found.discountPercent > 0) {
        const subtotal = cartItems.reduce((acc, item) => acc + item.sellPrice * item.qty, 0);
        const autoDisc = Math.round((subtotal * found.discountPercent) / 100);
        setDiscount(autoDisc);
      }
    }
  }, [selectedWholesaleId, cartItems, wholesaleCustomersList]);

  if (!isOpen) return null;

  // Helper to get active price for a sparepart based on priceMode or item preference
  const getItemPrice = (part: Sparepart, mode: 'ECER' | 'GROSIR') => {
    if (mode === 'GROSIR') {
      return part.wholesalePrice || Math.round((part.sellPrice || 0) * 0.9);
    }
    return part.sellPrice || 0;
  };

  // Switch Price Mode (recalculates existing cart item prices)
  const handleTogglePriceMode = (newMode: 'ECER' | 'GROSIR') => {
    setPriceMode(newMode);
    
    // Update existing items in cart to match the new global price mode
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const partRef = spareparts.find((p) => p.id === item.partId);
        if (!partRef) return item;
        const newPrice = getItemPrice(partRef, newMode);
        return {
          ...item,
          sellPrice: newPrice,
          priceType: newMode,
        };
      })
    );

    showTemporaryAlert(
      `Mode harga diubah ke ${newMode === 'GROSIR' ? 'GROSIR (Langganan)' : 'ECER (Retail)'}`,
      'success'
    );
  };

  // Handle Wholesale Customer Selector change
  const handleSelectWholesaleCustomer = (id: string) => {
    setSelectedWholesaleId(id);
    if (!id) {
      setCustomerName('Pembeli Langsung');
      setCustomerPhone('');
      return;
    }

    const found = wholesaleCustomersList.find((w) => w.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      if (priceMode !== 'GROSIR') {
        handleTogglePriceMode('GROSIR');
      }
    }
  };

  // Add Part to Cart
  const handleAddToCart = (part: Sparepart) => {
    const activePrice = getItemPrice(part, priceMode);
    const existingIndex = cartItems.findIndex((item) => item.partId === part.id);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      if (updated[existingIndex].qty < part.stock) {
        updated[existingIndex].qty += 1;
        // Keep active price updated
        updated[existingIndex].sellPrice = activePrice;
        updated[existingIndex].priceType = priceMode;
        setCartItems(updated);
        showTemporaryAlert(`Qty ${part.name} ditambah (Total: ${updated[existingIndex].qty})`, 'success');
      } else {
        showTemporaryAlert(`Stok ${part.name} hanya tersisa ${part.stock} ${part.unit}`, 'error');
      }
    } else {
      if (part.stock < 1) {
        showTemporaryAlert(`Stok ${part.name} sedang habis!`, 'error');
        return;
      }
      setCartItems([
        ...cartItems,
        {
          partId: part.id,
          code: part.code,
          name: part.name,
          qty: 1,
          sellPrice: activePrice,
          buyPrice: part.buyPrice,
          maxStock: part.stock,
          priceType: priceMode,
        },
      ]);
      showTemporaryAlert(
        `1x ${part.name} [${priceMode}] ditambahkan ke keranjang`,
        'success'
      );
    }
  };

  const handleUpdateQty = (partId: string, delta: number) => {
    setCartItems(
      cartItems
        .map((item) => {
          if (item.partId === partId) {
            const newQty = item.qty + delta;
            if (newQty > item.maxStock) {
              showTemporaryAlert(`Stok maksimal tersisa ${item.maxStock}`, 'error');
              return item;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemoveItem = (partId: string) => {
    setCartItems(cartItems.filter((item) => item.partId !== partId));
  };

  // Barcode Scanned Callback
  const handleBarcodeScanned = (scannedCode: string) => {
    const codeClean = scannedCode.trim().toUpperCase();
    const matchedPart = spareparts.find(
      (sp) => sp.code.toUpperCase() === codeClean || sp.id.toUpperCase() === codeClean
    );

    if (matchedPart) {
      handleAddToCart(matchedPart);
    } else {
      showTemporaryAlert(`Sparepart dengan barcode "${codeClean}" tidak ditemukan!`, 'error');
    }
  };

  const showTemporaryAlert = (msg: string, type: 'success' | 'error') => {
    setScanAlert({ message: msg, type });
    setTimeout(() => {
      setScanAlert(null);
    }, 3000);
  };

  // Calculations
  const subtotalParts = cartItems.reduce((acc, item) => acc + item.sellPrice * item.qty, 0);
  const grandTotal = Math.max(0, subtotalParts - discount);
  const changeAmount = paidAmount - grandTotal;

  // Set Default Paid Amount if 0 when selecting shortcuts
  const handleSetQuickCash = (amount: number) => {
    setPaidAmount(amount);
  };

  const handleExactCash = () => {
    setPaidAmount(grandTotal);
  };

  // Complete & Print Sale
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      alert('Keranjang penjualan masih kosong! Pilih minimal 1 sparepart.');
      return;
    }

    if (!isTempo && paidAmount < grandTotal) {
      alert(
        'Nominal pembayaran kurang dari total belanja!\nJika transaksi ini adalah Grosir Tempo / Kredit, aktifkan centang "Grosir Tempo / Piutang".'
      );
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefix = priceMode === 'GROSIR' ? 'GSR' : 'ECR';
    const orderId = `${prefix}-${todayDate}-${Math.floor(100 + Math.random() * 900)}`;

    const isUnpaid = isTempo && paidAmount < grandTotal;

    const newOrder: ServiceOrder = {
      id: orderId,
      customerName: customerName.trim() || (priceMode === 'GROSIR' ? 'Langganan Grosir' : 'Pembeli Langsung'),
      customerPhone: customerPhone.trim() || '-',
      plateNumber: priceMode === 'GROSIR' ? 'PENJUALAN GROSIR' : 'PENJUALAN ECER',
      motorModel: priceMode === 'GROSIR' ? 'Grosir Sparepart' : 'Penjualan Sparepart',
      complaint: priceMode === 'GROSIR' ? 'Transaksi Penjualan Grosir Langganan' : 'Penjualan Sparepart Eceran / Kasir Direct',
      mechanicId: 'KASIR',
      mechanicName: 'Kasir Toko',
      status: isUnpaid ? 'SELESAI' : 'LUNAS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      labors: [],
      parts: cartItems.map((c) => ({
        partId: c.partId,
        code: c.code,
        name: c.name,
        qty: c.qty,
        sellPrice: c.sellPrice,
        buyPrice: c.buyPrice,
      })),
      subtotalLabor: 0,
      subtotalParts: subtotalParts,
      discount: discount,
      totalAmount: grandTotal,
      paidAmount: paidAmount,
      changeAmount: Math.max(0, changeAmount),
      paymentMethod: paymentMethod,
      paymentStatus: isUnpaid ? 'BELUM' : 'LUNAS',
      dueDate: isUnpaid ? dueDate : undefined,
      mechanicCommissionPercent: 0,
      mechanicCommissionAmount: 0,
      notes: notes.trim() || (isUnpaid ? `Grosir Tempo (Jatuh Tempo: ${dueDate})` : 'Penjualan Langsung Kasir'),
    };

    onCompleteSale(newOrder);
    onClose();
  };

  // Filter Parts
  const filteredParts = spareparts.filter((part) => {
    const matchSearch =
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCategory = selectedCategory === 'Semua' || part.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  const categories = ['Semua', ...Array.from(new Set(spareparts.map((p) => p.category)))];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center transition-all duration-200 ${
          isMaximized ? 'p-0' : 'p-3 sm:p-5'
        } overflow-y-auto`}
      >
        <div
          className={`bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-200 ${
            isMaximized
              ? 'w-screen h-screen max-w-none max-h-none rounded-none border-none'
              : 'max-w-5xl w-full max-h-[94vh] rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl text-white shadow-md ${
                  priceMode === 'GROSIR' ? 'bg-purple-600' : 'bg-orange-500'
                }`}
              >
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold">
                    Penjualan Sparepart {priceMode === 'GROSIR' ? 'GROSIR' : 'ECER'}
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      priceMode === 'GROSIR'
                        ? 'bg-purple-500 text-white border border-purple-400'
                        : 'bg-orange-500 text-white border border-orange-400'
                    }`}
                  >
                    Mode {priceMode}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {priceMode === 'GROSIR'
                    ? 'Transaksi khusus langganan / toko mitra dengan skema harga grosir'
                    : 'Transaksi eceran umum dengan cetak nota termal langsung'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" /> Scan Barcode
              </button>

              {/* Maximize / Minimize Button */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5"
                title={isMaximized ? 'Tampilan Minimal / Ukuran Normal' : 'Tampilan Maksimal / Layar Penuh'}
              >
                {isMaximized ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Minimal</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Maksimal</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Toast Notification Alert */}
          {scanAlert && (
            <div
              className={`px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 ${
                scanAlert.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {scanAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{scanAlert.message}</span>
            </div>
          )}

          {/* Body Content Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
            {/* Left Column: Product Selection (7 cols) */}
            <div className="lg:col-span-7 p-4 flex flex-col border-r border-slate-200 overflow-hidden bg-white">
              {/* Category & Price Mode Toggle Toolbar */}
              <div className="space-y-2 mb-3">
                {/* Price Mode Selector Switch */}
                <div className="p-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 ml-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-orange-500" />
                    Kategori Harga Penjualan:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePriceMode('ECER')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        priceMode === 'ECER'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🛒 Harga Ecer (Jual Umum)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePriceMode('GROSIR')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        priceMode === 'GROSIR'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                    >
                      📦 Harga Grosir (Langganan)
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama sparepart atau scan barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Scan
                  </button>
                </div>

                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spareparts List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {filteredParts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Package className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">Sparepart tidak ditemukan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredParts.map((part) => {
                      const inCart = cartItems.find((c) => c.partId === part.id);
                      const isOutOfStock = part.stock <= 0;
                      const displayPrice = getItemPrice(part, priceMode);
                      const altPrice = getItemPrice(part, priceMode === 'GROSIR' ? 'ECER' : 'GROSIR');

                      return (
                        <div
                          key={part.id}
                          className={`p-2.5 rounded-xl border transition-all flex gap-2.5 items-stretch ${
                            inCart
                              ? priceMode === 'GROSIR'
                                ? 'bg-purple-50/80 border-purple-300 shadow-xs ring-1 ring-purple-200'
                                : 'bg-orange-50/80 border-orange-300 shadow-xs ring-1 ring-orange-200'
                              : isOutOfStock
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : 'bg-white border-slate-200 hover:border-orange-300 shadow-2xs'
                          }`}
                        >
                          {/* Part Image Thumbnail */}
                          <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center my-auto">
                            {part.imageUrl ? (
                              <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-300" />
                            )}
                          </div>

                          {/* Info Content */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded truncate">
                                  {part.code}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                    part.stock <= part.minStock ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  Stok: {part.stock}
                                </span>
                              </div>

                              <h4 className="font-bold text-slate-800 text-xs line-clamp-1 leading-snug" title={part.name}>
                                {part.name}
                              </h4>

                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[11px] font-extrabold font-mono ${
                                    priceMode === 'GROSIR' ? 'text-purple-700' : 'text-orange-600'
                                  }`}
                                >
                                  {formatRupiah(displayPrice)}
                                </span>
                                {priceMode === 'GROSIR' && (
                                  <span className="text-[9px] text-slate-400 line-through font-mono">
                                    {formatRupiah(part.sellPrice)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 mt-1">
                              <span className="text-[9px] text-slate-400 font-medium truncate">
                                Rak: {part.rackLocation}
                              </span>

                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={() => handleAddToCart(part)}
                                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                                  isOutOfStock
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : priceMode === 'GROSIR'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs active:scale-95'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs active:scale-95'
                                }`}
                              >
                                <Plus className="w-3 h-3 stroke-[3]" /> Pilih
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Cart & Checkout (5 cols) */}
            <div className="lg:col-span-5 p-4 flex flex-col bg-slate-50 overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Keranjang Belanja ({cartItems.length} Item)</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="text-[10px] text-red-600 font-semibold hover:underline cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </h3>

              {/* Cart Items List */}
              <div className="flex-1 min-h-[160px] max-h-[200px] overflow-y-auto space-y-2 mb-3 bg-white p-2.5 rounded-xl border border-slate-200">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                    <ShoppingCart className="w-8 h-8 mb-1 text-slate-300" />
                    <p className="text-xs font-medium">Keranjang masih kosong</p>
                    <p className="text-[10px] text-slate-400">Pilih item dari daftar atau scan barcode</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.partId}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] font-bold font-mono px-1 rounded ${
                              item.priceType === 'GROSIR' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {item.priceType}
                          </span>
                          <p className="font-bold text-slate-800 truncate">{item.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {formatRupiah(item.sellPrice)} x {item.qty} ={' '}
                          <span className="font-bold text-slate-900">{formatRupiah(item.sellPrice * item.qty)}</span>
                        </p>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.partId, -1)}
                          className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.partId, 1)}
                          className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.partId)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Customer & Payment */}
              <form onSubmit={handleCheckout} className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                {/* Wholesale Customer Selector */}
                {wholesaleCustomersList.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-purple-900 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        Pilih Langganan Grosir (Mitra Bengkel/Toko):
                      </span>
                    </label>
                    <select
                      value={selectedWholesaleId}
                      onChange={(e) => handleSelectWholesaleCustomer(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Pembeli Umum / Bukan Langganan --</option>
                      {wholesaleCustomersList.map((w) => (
                        <option key={w.id} value={w.id}>
                          🏢 {w.name} ({w.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Customer Name & Phone */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Pembeli</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Pembeli Langsung"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">No. HP / WA</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Subtotal & Discount */}
                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Belanja:</span>
                    <span className="font-bold">{formatRupiah(subtotalParts)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Diskon (Rp):</span>
                    <input
                      type="number"
                      min={0}
                      value={discount || ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-right text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900 font-extrabold text-sm">
                    <span>TOTAL BAYAR:</span>
                    <span
                      className={`text-base ${priceMode === 'GROSIR' ? 'text-purple-700' : 'text-orange-600'}`}
                    >
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['TUNAI', 'QRIS', 'TRANSFER', 'DEBIT'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.2 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                          paymentMethod === m
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid Amount */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Nominal Uang Bayar</label>
                    <button
                      type="button"
                      onClick={handleExactCash}
                      className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                    >
                      Uang Pas
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={paidAmount ? paidAmount.toLocaleString('id-ID') : ''}
                    placeholder="Masukkan nominal bayar..."
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPaidAmount(raw ? parseInt(raw, 10) : 0);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:border-orange-500 font-mono"
                  />

                  {/* Cash Quick Shortcuts */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[10000, 20000, 50000, 100000, 150000, 200000, 500000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSetQuickCash(val)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer font-mono"
                      >
                        {val >= 1000 ? `${val / 1000}rb` : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grosir Tempo / Credit Checkbox */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isTempo}
                      onChange={(e) => {
                        setIsTempo(e.target.checked);
                        if (!e.target.checked) {
                          setPaidAmount(grandTotal);
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-xs font-black text-purple-900">
                      Transaksi Grosir Tempo / Kredit Piutang
                    </span>
                  </label>

                  {isTempo && (
                    <div className="mt-2.5 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-purple-900">Tanggal Jatuh Tempo:</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="px-2.5 py-1 bg-white border border-purple-300 rounded-lg font-mono text-xs text-purple-950 font-bold focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <p className="text-[10px] text-purple-700">
                        {paidAmount < grandTotal ? (
                          <>
                            DP: <strong>{formatRupiah(paidAmount)}</strong> | Sisa Piutang Tempo:{' '}
                            <strong className="text-red-600">{formatRupiah(grandTotal - paidAmount)}</strong>
                          </>
                        ) : (
                          'Masukkan nominal DP / Uang Muka di atas (boleh 0)'
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Change or Remaining Debt */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    isTempo && paidAmount < grandTotal
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : changeAmount >= 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <span>
                    {isTempo && paidAmount < grandTotal ? 'Sisa Tagihan Tempo:' : 'Kembalian:'}
                  </span>
                  <span className="text-sm font-mono font-extrabold">
                    {isTempo && paidAmount < grandTotal
                      ? formatRupiah(grandTotal - paidAmount)
                      : formatRupiah(changeAmount)}
                  </span>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || (!isTempo && paidAmount < grandTotal)}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                    cartItems.length === 0 || (!isTempo && paidAmount < grandTotal)
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : isTempo
                      ? 'bg-purple-800 hover:bg-purple-900 text-white'
                      : priceMode === 'GROSIR'
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Printer className="w-4 h-4" />{' '}
                  {isTempo ? 'SIMPAN GROSIR TEMPO & CETAK STRUK' : `BAYAR & CETAK STRUK (${priceMode})`}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          handleBarcodeScanned(code);
        }}
        title="Scan Barcode Sparepart Kasir"
        subtitle="Dekatkan barcode ke kamera HP / Laptop atau gunakan USB Scanner"
      />
    </>
  );
};

