import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, QrCode, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode Sparepart',
  subtitle = 'Arahkan kamera ke barcode dus / produk atau gunakan Scanner USB Barcode',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'barcode-scanner-reader';

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setCameraError(null);
      setLastScanned(null);
      return;
    }

    // Auto focus manual input if hardware scanner is attached
    const timer = setTimeout(() => {
      const inputEl = document.getElementById('manual-barcode-input');
      if (inputEl) inputEl.focus();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('Kamera tidak ditemukan pada perangkat ini.');
        return;
      }

      // Prefer back camera on mobile or default first camera
      const cameraId = devices.length > 1 ? devices[devices.length - 1].id : devices[0].id;

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 160 },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Ignore scanning errors during frame search
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to start camera scanner', err);
      setCameraError('Gagal mengakses kamera. Mohon izinkan akses kamera di browser Anda.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isCameraActive) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Stop scanner error', err);
      }
      setIsCameraActive(false);
    }
  };

  const handleDetectedCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    // Play subtle audio beep if browser allows
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted
    }

    setLastScanned(cleanCode);
    onScan(cleanCode);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode);
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-[#1E293B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500 text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-[11px] text-slate-300">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick Hardware Barcode USB / Keyboard Input */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
              <span>Input Scanner USB / Manual Code:</span>
              <span className="text-[10px] text-orange-600 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" /> Auto-Focus Ready
              </span>
            </label>
            <div className="flex gap-2">
              <input
                id="manual-barcode-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan barcode dengan USB Scanner atau ketik di sini..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Scan
              </button>
            </div>
          </form>

          {/* Camera Scanner Container */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-orange-500" /> Scanner Kamera HP / Webcam
              </span>

              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Aktifkan Kamera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white font-bold text-[11px] rounded-md transition-colors cursor-pointer"
                >
                  Matikan Kamera
                </button>
              )}
            </div>

            {/* Video Viewport */}
            <div className="relative bg-slate-900 rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center border border-slate-800">
              <div id={readerElementId} className="w-full h-full text-white"></div>

              {!isCameraActive && !cameraError && (
                <div className="text-center p-6 text-slate-400">
                  <Camera className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-medium">Klik &quot;Aktifkan Kamera&quot; untuk scan barcode via webcam/HP</p>
                </div>
              )}

              {cameraError && (
                <div className="text-center p-6 text-red-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="text-xs font-semibold">{cameraError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Last Scanned Code Feedback */}
          {lastScanned && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    Barcode Terdeteksi:
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {lastScanned}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Close */}
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
            >
              Tutup Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
