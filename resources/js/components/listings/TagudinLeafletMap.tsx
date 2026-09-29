import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    Target,
    RotateCcw,
} from 'lucide-react';

export type MapTileMode = 'road' | 'satellite';

export interface TagudinLeafletMapProps {
    coordinates: { lat: number; lng: number };
    hasPinnedCoordinates: boolean;
    onCoordinatesChange: (lat: number, lng: number) => void;
    initialZoom?: number;
    heightClassName?: string;
}

const DEFAULT_TAGUDIN_CENTER = { lat: 16.9388, lng: 120.4439 };

const createSerbizyuPinIcon = () => {
    return L.divIcon({
        className: 'serbizyu-leaflet-marker',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        html: `
            <div style="position: relative; width: 32px; height: 42px; display: flex; align-items: flex-end; justify-content: center;">
                <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 47, 88, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(15,23,42,0.35)); cursor: grab;">
                    <path d="M16 42C16 42 32 26 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 26 16 42 16 42Z" fill="#0F2F58" stroke="#FFFFFF" stroke-width="2"/>
                    <circle cx="16" cy="15" r="5.5" fill="#FFC72C"/>
                </svg>
            </div>
        `,
    });
};

export default function TagudinLeafletMap({
    coordinates,
    hasPinnedCoordinates,
    onCoordinatesChange,
    initialZoom = 16,
    heightClassName = 'h-80 sm:h-96',
}: TagudinLeafletMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const currentTileLayerRef = useRef<L.TileLayer | null>(null);
    const onCoordinatesChangeRef = useRef(onCoordinatesChange);
    onCoordinatesChangeRef.current = onCoordinatesChange;

    const [tileMode, setTileMode] = useState<MapTileMode>('road');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(initialZoom);
    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [coordinates.lat || DEFAULT_TAGUDIN_CENTER.lat, coordinates.lng || DEFAULT_TAGUDIN_CENTER.lng],
            zoom: initialZoom,
            minZoom: 11,
            maxZoom: 19,
            zoomControl: false,
            attributionControl: true,
            scrollWheelZoom: true,
        });

        mapInstanceRef.current = map;

        // Initial Road Layer (OpenStreetMap Carto/OSM standard)
        const roadLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        }).addTo(map);

        currentTileLayerRef.current = roadLayer;

        // Custom Marker
        const marker = L.marker([coordinates.lat, coordinates.lng], {
            icon: createSerbizyuPinIcon(),
            draggable: true,
            autoPan: true,
        }).addTo(map);

        markerRef.current = marker;

        // Marker Drag End Listener
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            const lat = parseFloat(pos.lat.toFixed(6));
            const lng = parseFloat(pos.lng.toFixed(6));
            onCoordinatesChangeRef.current(lat, lng);
        });

        // Map Click Listener (Places or moves marker)
        map.on('click', (e: L.LeafletMouseEvent) => {
            const lat = parseFloat(e.latlng.lat.toFixed(6));
            const lng = parseFloat(e.latlng.lng.toFixed(6));
            marker.setLatLng([lat, lng]);
            onCoordinatesChangeRef.current(lat, lng);
        });
        // Zoom change tracking
        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom());
        });

        // Trackpad & Mouse Wheel Isolation: prevent laptop trackpad pinch or wheel from zooming parent webpage
        const container = mapContainerRef.current;
        const handleWheel = (e: WheelEvent) => {
            e.stopPropagation();
            if (e.ctrlKey) {
                e.preventDefault(); // Stop laptop trackpad pinch gesture from triggering browser full-page zoom
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
            currentTileLayerRef.current = null;
        };
    }, []);

    // Sync Marker position when coordinates prop changes externally (e.g. GPS button clicked or dropdown changed)
    useEffect(() => {
        if (!markerRef.current) return;
        const currentLatLng = markerRef.current.getLatLng();
        if (
            Math.abs(currentLatLng.lat - coordinates.lat) > 0.00001 ||
            Math.abs(currentLatLng.lng - coordinates.lng) > 0.00001
        ) {
            markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo([coordinates.lat, coordinates.lng]);
            }
        }
    }, [coordinates.lat, coordinates.lng]);

    // Switch between Road and Satellite Tile Layers without remounting the map
    const handleSwitchTileMode = useCallback((newMode: MapTileMode) => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (currentTileLayerRef.current) {
            map.removeLayer(currentTileLayerRef.current);
        }

        if (newMode === 'satellite') {
            // High-Resolution Esri World Imagery Satellite Tiles
            const satelliteLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 19,
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, GIS User Community',
                }
            ).addTo(map);
            currentTileLayerRef.current = satelliteLayer;
        } else {
            // OpenStreetMap Standard Road Tiles
            const roadLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
            }).addTo(map);
            currentTileLayerRef.current = roadLayer;
        }

        setTileMode(newMode);
    }, []);

    // Floating Controls Handlers
    const handleZoomIn = () => {
        mapInstanceRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
        mapInstanceRef.current?.zoomOut();
    };

    const handleCenterPin = () => {
        if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView(markerRef.current.getLatLng(), Math.max(16, mapInstanceRef.current.getZoom()));
        }
    };

    const handleResetTagudinView = () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([DEFAULT_TAGUDIN_CENTER.lat, DEFAULT_TAGUDIN_CENTER.lng], 14);
        }
    };

    // Fullscreen Toggle
    const toggleFullscreen = () => {
        setIsFullscreen((prev) => !prev);
    };

    // Invalidate map size after fullscreen resize
    useEffect(() => {
        const timer = setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 150);
        return () => clearTimeout(timer);
    }, [isFullscreen]);

    return (
        <div
            data-testid="tagudin-leaflet-map-wrapper"
            className={
                isFullscreen
                    ? 'fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md'
                    : 'relative w-full'
            }
        >
            <div
                className={`relative w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-inner ${
                    isFullscreen ? 'flex-1 h-full' : heightClassName
                }`}
            >
                {/* The Real Leaflet Map DOM Node */}
                <div
                    ref={mapContainerRef}
                    data-testid="tagudin-leaflet-map"
                    className="size-full z-0 cursor-crosshair"
                />

                {/* Top-Right: Dual Mode Switcher [ 🗺️ Map | 🛰️ Satellite ] */}
                <div
                    data-testid="map-tile-mode-switcher"
                    className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur-md"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => handleSwitchTileMode('road')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            tileMode === 'road'
                                ? 'bg-[#0F2F58] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        title="Standard road and street map"
                    >
                        <span>🗺️</span>
                        <span>Map</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchTileMode('satellite')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            tileMode === 'satellite'
                                ? 'bg-[#0F2F58] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        title="Real high-resolution satellite photography"
                    >
                        <span>🛰️</span>
                        <span>Satellite</span>
                    </button>
                </div>

                {/* Floating Map Navigation Controls (Top-Left) */}
                <div
                    className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur-md"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Zoom In (+)"
                    >
                        <ZoomIn className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Zoom Out (−)"
                    >
                        <ZoomOut className="size-4" />
                    </button>
                    <div className="my-0.5 h-px bg-slate-200" />
                    <button
                        type="button"
                        onClick={handleCenterPin}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Center on Dropped Pin"
                    >
                        <Target className="size-4 text-[#0F2F58]" />
                    </button>
                    <button
                        type="button"
                        onClick={handleResetTagudinView}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Reset Full Municipality View"
                    >
                        <RotateCcw className="size-3.5 text-slate-500" />
                    </button>
                    <div className="my-0.5 h-px bg-slate-200" />
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="size-3.5 text-[#0F2F58]" />
                        ) : (
                            <Maximize2 className="size-3.5 text-[#0F2F58]" />
                        )}
                    </button>
                </div>

                {/* Floating Bottom Status Pill */}
                <div
                    className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-2xs backdrop-blur-md pointer-events-none"
                >
                    <span className={`size-2 rounded-full ${hasPinnedCoordinates ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>Zoom: {currentZoom}x</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                        {tileMode === 'satellite' ? 'Satellite View' : 'Road Map'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[#0F2F58]">
                        Click or drag pin to place
                    </span>
                </div>
            </div>

            {isFullscreen && (
                <div className="mt-2 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-slate-900 shadow-md hover:bg-slate-100 cursor-pointer"
                    >
                        Close Fullscreen Map
                    </button>
                </div>
            )}
        </div>
    );
}
