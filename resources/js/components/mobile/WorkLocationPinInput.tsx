import { useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

type LocationProof = {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    source: 'gps' | 'manual';
    observed_at: string;
    landmark?: string | null;
};

type WorkLocationPinInputProps = {
    disabled: boolean;
    onChange: (location: LocationProof | null) => void;
};

export default function WorkLocationPinInput({ disabled, onChange }: WorkLocationPinInputProps) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const [location, setLocation] = useState<LocationProof | null>(null);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [manualPinOpen, setManualPinOpen] = useState(false);
    const [geolocating, setGeolocating] = useState(false);
    const [landmark, setLandmark] = useState('');
    const [error, setError] = useState<string | null>(null);

    const save = (nextLocation: LocationProof | null) => {
        setLocation(nextLocation);
        onChangeRef.current(nextLocation);
    };

    const useDeviceLocation = () => {
        if (!navigator.geolocation) {
            setError('Device location is unavailable. Enter a coordinate pin manually.');
            setManualPinOpen(true);
            return;
        }

        setGeolocating(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const nextLocation: LocationProof = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy_m: position.coords.accuracy,
                    source: 'gps',
                    observed_at: new Date(position.timestamp).toISOString(),
                    landmark: landmark.trim() || null,
                };
                setLatitude(String(nextLocation.latitude));
                setLongitude(String(nextLocation.longitude));
                setManualPinOpen(false);
                save(nextLocation);
                setGeolocating(false);
            },
            () => {
                setError('Device location was unavailable or denied. Enter a manual coordinate pin.');
                setManualPinOpen(true);
                setGeolocating(false);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
        );
    };

    const updateManualPin = (nextLatitude: string, nextLongitude: string) => {
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        const parsedLatitude = Number(nextLatitude);
        const parsedLongitude = Number(nextLongitude);
        if (
            nextLatitude.trim() === ''
            || nextLongitude.trim() === ''
            || !Number.isFinite(parsedLatitude)
            || !Number.isFinite(parsedLongitude)
            || parsedLatitude < -90
            || parsedLatitude > 90
            || parsedLongitude < -180
            || parsedLongitude > 180
        ) {
            save(null);
            return;
        }

        save({
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            accuracy_m: null,
            source: 'manual',
            observed_at: new Date().toISOString(),
            landmark: landmark.trim() || null,
        });
    };

    return (
        <section className="space-y-3 border-t border-slate-200 pt-4" data-testid="work-location-pin">
            <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 text-[#0F2F58]" aria-hidden="true" />
                <div>
                    <h5 className="text-xs font-bold text-slate-900">Location pin</h5>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Device or manually entered coordinates are provider-reported, not independently verified.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={useDeviceLocation}
                    disabled={disabled || geolocating}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0F2F58] px-3 py-2 text-xs font-bold text-white hover:bg-[#153e74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {geolocating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
                    {geolocating ? 'Finding location…' : 'Use device location'}
                </button>
                <button
                    type="button"
                    onClick={() => setManualPinOpen((open) => !open)}
                    disabled={disabled}
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {manualPinOpen ? 'Hide manual pin' : 'Enter coordinates manually'}
                </button>
            </div>

            {error && <p className="text-xs text-amber-900" role="status">{error}</p>}

            {manualPinOpen && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-semibold text-slate-700">
                        Latitude
                        <input
                            inputMode="decimal"
                            type="number"
                            min="-90"
                            max="90"
                            step="any"
                            value={latitude}
                            onChange={(event) => updateManualPin(event.currentTarget.value, longitude)}
                            disabled={disabled}
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                        />
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-slate-700">
                        Longitude
                        <input
                            inputMode="decimal"
                            type="number"
                            min="-180"
                            max="180"
                            step="any"
                            value={longitude}
                            onChange={(event) => updateManualPin(latitude, event.currentTarget.value)}
                            disabled={disabled}
                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                        />
                    </label>
                </div>
            )}
            <label className="block space-y-1 text-xs font-semibold text-slate-700">
                Landmark or entrance <span className="font-normal text-slate-500">(optional)</span>
                <input
                    type="text"
                    maxLength={120}
                    value={landmark}
                    onChange={(event) => {
                        const nextLandmark = event.currentTarget.value;
                        setLandmark(nextLandmark);
                        if (location !== null) {
                            save({ ...location, landmark: nextLandmark.trim() || null });
                        }
                    }}
                    disabled={disabled}
                    placeholder="e.g. near the blue gate"
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                />
            </label>

            {location && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-950" role="status">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                        Pin recorded: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        {location.source === 'gps' && location.accuracy_m !== null
                            ? ` · device accuracy ±${Math.round(location.accuracy_m)} m`
                            : ' · manual entry'}
                        {location.landmark ? ` · ${location.landmark}` : ''}
                    </span>
                </div>
            )}
        </section>
    );
}
