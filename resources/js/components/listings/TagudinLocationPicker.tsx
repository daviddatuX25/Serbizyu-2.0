import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    MapPin,
    Compass,
    Check,
    Navigation,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import {
    REGIONS,
    TAGUDIN_BARANGAYS_43,
    PROVINCES,
    MUNICIPALITIES,
    type PhilippineBarangay,
    type CanonicalGeography,
    type PhilippineCoordinates,
    normalizeGeography,
} from '../../lib/philippineAddresses';
import TagudinLeafletMap from './TagudinLeafletMap';

// Re-export for compatibility with consumers
export type StructuredGeography = CanonicalGeography;
export type LocationCoordinates = { lat: number; lng: number };

interface TagudinLocationPickerProps {
    value?: StructuredGeography | null;
    initialAddress?: string;
    locationLabel?: string;
    addressPlaceholder?: string;
    onChange: (geo: StructuredGeography) => void;
}

export default function TagudinLocationPicker({
    value,
    initialAddress = 'Tagudin Public Market, Rizal',
    locationLabel = 'Stall / Dispatch Location in Tagudin',
    addressPlaceholder = 'e.g. Stall #14, Public Market, Rizal',
    onChange,
}: TagudinLocationPickerProps) {
    const initialGeo = useMemo(() => normalizeGeography(value, initialAddress), []);

    const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>(initialGeo.province_code);
    const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState<string>(initialGeo.municipality_code);
    const [selectedBarangayCode, setSelectedBarangayCode] = useState<string>(initialGeo.barangay_code);
    const [coordinates, setCoordinates] = useState<PhilippineCoordinates>(initialGeo.coordinates);
    const [addressLine1, setAddressLine1] = useState<string>(initialGeo.address_line_1);
    const [hasPinnedCoordinates, setHasPinnedCoordinates] = useState<boolean>(initialGeo.has_pinned_coordinates);

    // Geolocation API State
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'locked' | 'error' | 'denied'>('idle');
    const [gpsMessage, setGpsMessage] = useState<string | null>(null);

    const availableMunicipalities = useMemo(() => {
        const filtered = MUNICIPALITIES.filter((m) => m.province_code === selectedProvinceCode);
        return filtered.length > 0 ? filtered : MUNICIPALITIES;
    }, [selectedProvinceCode]);

    const emitChange = useCallback(
        (
            newCoords: PhilippineCoordinates,
            barangayCode: string,
            addressLine: string,
            isPinned: boolean,
            provinceCode = selectedProvinceCode,
            municipalityCode = selectedMunicipalityCode,
        ) => {
            const matchedBarangay = TAGUDIN_BARANGAYS_43.find((b) => b.code === barangayCode) || TAGUDIN_BARANGAYS_43[0];
            const matchedProvince = PROVINCES.find((p) => p.code === provinceCode) || PROVINCES[0];
            const matchedMunicipality = MUNICIPALITIES.find((m) => m.code === municipalityCode) || MUNICIPALITIES[0];
            const matchedRegion = REGIONS.find((r) => r.code === matchedProvince.region_code) || REGIONS[0];

            const updated: CanonicalGeography = {
                version: 1,
                area_code: matchedMunicipality.name,
                region_code: matchedRegion.code,
                region_name: matchedRegion.name,
                province_code: matchedProvince.code,
                province_name: matchedProvince.name,
                municipality_code: matchedMunicipality.code,
                municipality_name: matchedMunicipality.name,
                postal_code: matchedMunicipality.postal_code,
                barangay_code: matchedBarangay.code,
                barangay_name: matchedBarangay.name,
                address_line_1: addressLine,
                stall_location: addressLine,
                landmark: matchedBarangay.landmark,
                coordinates: newCoords,
                has_pinned_coordinates: isPinned,
                service_radius_km: 5.0,
            };

            onChange(updated);
        },
        [selectedProvinceCode, selectedMunicipalityCode, onChange],
    );

    // Initial state commitment: notify parent on mount so geography is populated without fake pinned state
    useEffect(() => {
        if (!value) {
            emitChange(
                initialGeo.coordinates,
                initialGeo.barangay_code,
                initialGeo.address_line_1,
                initialGeo.has_pinned_coordinates,
            );
        }
    }, []);

    const handleSelectBarangay = (b: PhilippineBarangay) => {
        setSelectedBarangayCode(b.code);

        // Keep existing pin coordinates if user already has an active pin
        let nextCoords = coordinates;
        let isPinned = hasPinnedCoordinates;

        if (!hasPinnedCoordinates) {
            nextCoords = {
                lat: 16.9388,
                lng: 120.4439,
                accuracy_m: null,
                source: 'default',
                captured_at: null,
            };
            isPinned = false;
        }

        const newAddr = addressLine1 && (addressLine1.includes('Stall') || addressLine1.includes('Shop'))
            ? addressLine1
            : `${b.landmark}, ${b.name}`;
        setAddressLine1(newAddr);
        emitChange(nextCoords, b.code, newAddr, isPinned);
    };

    // Native Browser Geolocation: Detect exact current coordinates via hardware GPS
    const handleDetectCurrentLocation = () => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            setGpsMessage('Geolocation is not supported by your browser.');
            return;
        }

        setGpsStatus('requesting');
        setGpsMessage('Detecting GPS satellite coordinates...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const roundedLat = parseFloat(latitude.toFixed(6));
                const roundedLng = parseFloat(longitude.toFixed(6));
                const roundedAcc = Math.round(accuracy);

                const newCoords: PhilippineCoordinates = {
                    lat: roundedLat,
                    lng: roundedLng,
                    accuracy_m: roundedAcc,
                    source: 'gps',
                    captured_at: new Date().toISOString(),
                };

                setCoordinates(newCoords);
                setHasPinnedCoordinates(true);
                setGpsStatus('locked');
                setGpsMessage(`GPS Locked (±${roundedAcc}m accuracy)`);

                emitChange(newCoords, selectedBarangayCode, addressLine1, true);
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    setGpsStatus('denied');
                    setGpsMessage('Location permission denied. Please drop pin manually on map.');
                } else {
                    setGpsStatus('error');
                    setGpsMessage('Unable to retrieve device GPS fix.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000,
            },
        );
    };

    // Handler when user drags or clicks on the interactive Leaflet map
    const handleMapCoordinateChange = (lat: number, lng: number) => {
        const manualCoords: PhilippineCoordinates = {
            lat,
            lng,
            accuracy_m: null,
            source: 'manual',
            captured_at: new Date().toISOString(),
        };

        setCoordinates(manualCoords);
        setHasPinnedCoordinates(true);
        setGpsStatus('locked');
        setGpsMessage('Manual Pin Dropped');

        emitChange(manualCoords, selectedBarangayCode, addressLine1, true);
    };

    return (
        <div data-testid="tagudin-location-picker" className="space-y-4 rounded-2xl border border-slate-200/90 bg-[#FAFCFB] p-4 shadow-2xs">
            {/* Header Title & GPS Hardware Action */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#0F2F58] text-[#FFC72C]">
                        <MapPin className="size-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-extrabold text-[#0F2F58]">{locationLabel}</h4>
                        <p className="text-[11px] text-slate-500">
                            PSGC Region I · Ilocos Sur · Tagudin (2714)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDetectCurrentLocation}
                        disabled={gpsStatus === 'requesting'}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
                        title="Use device GPS antenna to detect exact coordinates"
                    >
                        {gpsStatus === 'requesting' ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Navigation className="size-3.5" />
                        )}
                        <span>Detect Current GPS Location</span>
                    </button>

                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-mono font-bold text-slate-700 shadow-2xs">
                        <Compass className="size-3.5 text-[#0F2F58]" />
                        <span>
                            {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E
                        </span>
                    </div>
                </div>
            </div>

            {/* GPS Feedback Notice */}
            {gpsMessage && (
                <div
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                        gpsStatus === 'locked'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : gpsStatus === 'denied' || gpsStatus === 'error'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                >
                    {gpsStatus === 'locked' ? (
                        <Check className="size-3.5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>{gpsMessage}</span>
                </div>
            )}

            {/* 4-Tier Philippine Address Cascading Grid */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {/* 1. Province */}
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Province</label>
                    <select
                        value={selectedProvinceCode}
                        onChange={(e) => {
                            const nextProv = e.target.value;
                            setSelectedProvinceCode(nextProv);
                            const valid = MUNICIPALITIES.filter((m) => m.province_code === nextProv);
                            const nextMuni = valid.length > 0 ? valid[0].code : selectedMunicipalityCode;
                            setSelectedMunicipalityCode(nextMuni);
                            emitChange(coordinates, selectedBarangayCode, addressLine1, hasPinnedCoordinates, nextProv, nextMuni);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0F2F58]"
                    >
                        {PROVINCES.map((p) => (
                            <option key={p.code} value={p.code}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. City / Municipality */}
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">City / Municipality</label>
                    <select
                        value={selectedMunicipalityCode}
                        onChange={(e) => {
                            setSelectedMunicipalityCode(e.target.value);
                            emitChange(coordinates, selectedBarangayCode, addressLine1, hasPinnedCoordinates, selectedProvinceCode, e.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0F2F58]"
                    >
                        {availableMunicipalities.map((m) => (
                            <option key={m.code} value={m.code}>
                                {m.name} ({m.postal_code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* 3. Barangay Dropdown (43 PSA PSGC Barangays) */}
                <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Barangay ({TAGUDIN_BARANGAYS_43.length} PSA PSGC)
                    </label>
                    <select
                        value={selectedBarangayCode}
                        onChange={(e) => {
                            const found = TAGUDIN_BARANGAYS_43.find((b) => b.code === e.target.value);
                            if (found) handleSelectBarangay(found);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0F2F58]"
                    >
                        {TAGUDIN_BARANGAYS_43.map((b) => (
                            <option key={b.code} value={b.code}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 4. Address Line 1 (Street / Stall / House / Building) */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">Address Line 1 (Street / Stall / Building Name)</label>
                    <span className="text-[10px] text-slate-400">Physical collection &amp; dispatch point</span>
                </div>
                <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => {
                        const val = e.target.value;
                        setAddressLine1(val);
                        emitChange(coordinates, selectedBarangayCode, val, hasPinnedCoordinates);
                    }}
                    placeholder={addressPlaceholder}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58]"
                />
            </div>

            {/* In-App Interactive Slippy Map (Roads + Satellite Layer + Wheel Zoom Isolation + Fullscreen) */}
            <TagudinLeafletMap
                coordinates={coordinates}
                hasPinnedCoordinates={hasPinnedCoordinates}
                onCoordinatesChange={handleMapCoordinateChange}
                heightClassName="h-80 sm:h-96"
            />
        </div>
    );
}
