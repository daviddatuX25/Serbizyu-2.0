import { useState } from 'react';
import { Camera, CheckCircle2, QrCode, Sparkles } from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';

export interface QuickDealScanModalProps {
    open: boolean;
    onClose: () => void;
    userPhone?: string;
    userName?: string;
}

export function QuickDealScanModal({
    open,
    onClose,
    userPhone = '+63 917 123 4567',
    userName = 'Tagudin Resident',
}: QuickDealScanModalProps) {
    const [scanMode, setScanMode] = useState<'my_qr' | 'scan_camera'>('my_qr');
    const [scannedSuccess, setScannedSuccess] = useState(false);

    const handleSimulateScan = () => {
        setScannedSuccess(true);
        setTimeout(() => {
            alert(
                'Quick Deal Verified! Matched with Kuya Ben (AC Technician, Tagudin Centro). Ready for instant cash agreement.',
            );
            setScannedSuccess(false);
            onClose();
        }, 1200);
    };

    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title="Quick Deal QR Handshake"
            subtitle="Instant local agreement & zero-fee cash handoff in Tagudin"
        >
            <div className="flex flex-col items-center gap-4 py-2 font-['Plus_Jakarta_Sans',sans-serif]">
                {/* Segment Mode Switcher */}
                <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                    <button
                        type="button"
                        onClick={() => setScanMode('my_qr')}
                        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                            scanMode === 'my_qr'
                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <QrCode className="size-3.5" />
                        <span>My Citizen QR</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setScanMode('scan_camera')}
                        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                            scanMode === 'scan_camera'
                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Camera className="size-3.5" />
                        <span>Scan Provider QR</span>
                    </button>
                </div>

                {/* View 1: Citizen Handshake QR */}
                {scanMode === 'my_qr' ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="rounded-2xl border-2 border-[#0F2F58] bg-white p-5 shadow-md">
                            {/* SVG Simulated Clean QR Code */}
                            <svg
                                className="size-48 text-[#0F2F58]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <rect width="6" height="6" x="2" y="2" rx="1.5" />
                                <rect width="6" height="6" x="16" y="2" rx="1.5" />
                                <rect width="6" height="6" x="2" y="16" rx="1.5" />
                                <circle cx="5" cy="5" r="1.5" fill="#0F2F58" />
                                <circle cx="19" cy="5" r="1.5" fill="#0F2F58" />
                                <circle cx="5" cy="19" r="1.5" fill="#0F2F58" />
                                <path
                                    d="M10 2h4M10 6h1M13 6h1M10 10h4M16 10h2M20 10v2M10 14h2M14 14v2M18 14h2M10 18v4M14 18h2M18 18v4M22 18h-2"
                                    strokeWidth="2.2"
                                />
                            </svg>
                        </div>
                        <div className="mt-3 text-sm font-extrabold text-slate-900">{userName}</div>
                        <div className="font-mono text-xs text-slate-500">{userPhone}</div>
                        <p className="mt-2 max-w-[260px] text-[11.5px] leading-relaxed text-slate-500">
                            Show this QR code to any Tagudin provider or courier to pair your order
                            instantly.
                        </p>
                    </div>
                ) : null}

                {/* View 2: Camera Viewfinder Scanner Simulation */}
                {scanMode === 'scan_camera' ? (
                    <div className="flex w-full flex-col items-center text-center">
                        <div className="relative flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 p-6 text-white shadow-lg">
                            {/* Scanning Laser Animation Line */}
                            <div className="absolute inset-x-4 top-1/2 h-0.5 animate-pulse bg-[#FFC244] shadow-[0_0_12px_#FFC244]" />

                            <div className="flex flex-col items-center gap-2">
                                <Camera className="size-10 stroke-[1.5] text-slate-400" />
                                <span className="text-xs font-bold text-slate-300">
                                    Point at Provider's QR Code
                                </span>
                            </div>

                            {/* Viewfinder Corners */}
                            <div className="absolute top-3 left-3 size-5 border-t-2 border-l-2 border-[#FFC244]" />
                            <div className="absolute top-3 right-3 size-5 border-t-2 border-r-2 border-[#FFC244]" />
                            <div className="absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-[#FFC244]" />
                            <div className="absolute right-3 bottom-3 size-5 border-r-2 border-b-2 border-[#FFC244]" />
                        </div>

                        {scannedSuccess ? (
                            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                <CheckCircle2 className="size-4" />
                                <span>Tagudin Provider Verified!</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSimulateScan}
                                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                            >
                                <Sparkles className="size-3.5 text-amber-600" />
                                <span>Simulate Scanning Kuya Ben's QR</span>
                            </button>
                        )}
                    </div>
                ) : null}
            </div>
        </GlovoWaveModal>
    );
}

export default QuickDealScanModal;
