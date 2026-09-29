/**
 * Philippine Standard Geographic Code (PSGC) & Address Architecture for Serbizyu Tagudin.
 * Governs the 4-tier cascading hierarchy:
 * Region -> Province -> City / Municipality -> Barangay -> Address Line 1 / Street / Stall
 *
 * Official PSA 10-Digit PSGC Standard:
 * - Region I: 0100000000
 * - Province (Ilocos Sur): 0102900000
 * - Municipality (Tagudin): 0102933000
 * - Barangays: 0102933001 through 0102933043
 */

export interface PhilippineRegion {
    code: string;
    name: string;
    designation: string;
}

export interface PhilippineProvince {
    code: string;
    region_code: string;
    name: string;
}

export interface PhilippineMunicipality {
    code: string;
    province_code: string;
    name: string;
    postal_code: string;
}

export interface PhilippineBarangay {
    code: string;
    psgc_code: string;
    municipality_code: string;
    name: string;
    type: 'commercial' | 'coastal' | 'residential' | 'agricultural';
    landmark: string;
    lat?: number;
    lng?: number;
}

export type CoordinateSource = 'gps' | 'manual' | 'default';

export interface PhilippineCoordinates {
    lat: number;
    lng: number;
    accuracy_m?: number | null;
    source?: CoordinateSource;
    captured_at?: string | null;
}

export interface CanonicalGeography {
    version: 1;
    area_code: string;
    region_code: string;
    region_name: string;
    province_code: string;
    province_name: string;
    municipality_code: string;
    municipality_name: string;
    postal_code: string;
    barangay_code: string;
    barangay_name: string;
    address_line_1: string;
    stall_location?: string;
    landmark?: string;
    coordinates: PhilippineCoordinates;
    has_pinned_coordinates: boolean;
    service_radius_km: number;
}

export const REGIONS: PhilippineRegion[] = [
    { code: '0100000000', name: 'Ilocos Region', designation: 'Region I' },
    { code: '0200000000', name: 'Cagayan Valley', designation: 'Region II' },
    { code: '0300000000', name: 'Central Luzon', designation: 'Region III' },
    { code: '1400000000', name: 'Cordillera Administrative Region', designation: 'CAR' },
];

export const PROVINCES: PhilippineProvince[] = [
    { code: '0102900000', region_code: '0100000000', name: 'Ilocos Sur' },
    { code: '0102800000', region_code: '0100000000', name: 'Ilocos Norte' },
    { code: '0103300000', region_code: '0100000000', name: 'La Union' },
    { code: '1400100000', region_code: '1400000000', name: 'Abra' },
    { code: '0105500000', region_code: '0100000000', name: 'Pangasinan' },
];

export const MUNICIPALITIES: PhilippineMunicipality[] = [
    { code: '0102933000', province_code: '0102900000', name: 'Tagudin', postal_code: '2714' },
    { code: '0102928000', province_code: '0102900000', name: 'Santa Cruz', postal_code: '2713' },
    { code: '0102931000', province_code: '0102900000', name: 'Suyo', postal_code: '2715' },
    { code: '0102901000', province_code: '0102900000', name: 'Alilem', postal_code: '2716' },
    { code: '0103302000', province_code: '0103300000', name: 'Bangar', postal_code: '2519' },
    { code: '0103317000', province_code: '0103300000', name: 'Sudipen', postal_code: '2520' },
];

/**
 * Official 43 Barangays of Tagudin, Ilocos Sur (PSA 10-Digit PSGC: 0102933000)
 * Sourced directly from Philippine Statistics Authority (PSA) Standard Geographic Codes.
 */
export const TAGUDIN_BARANGAYS_43: PhilippineBarangay[] = [
    { code: '0102933001', psgc_code: '0102933001', municipality_code: '0102933000', name: 'Ag-aguman', type: 'agricultural', landmark: 'Ag-aguman Elementary School' },
    { code: '0102933002', psgc_code: '0102933002', municipality_code: '0102933000', name: 'Ambalayat', type: 'residential', landmark: 'Ambalayat Chapel & Rural Health Station' },
    { code: '0102933003', psgc_code: '0102933003', municipality_code: '0102933000', name: 'Baracbac', type: 'agricultural', landmark: 'Baracbac Barangay Hall' },
    { code: '0102933004', psgc_code: '0102933004', municipality_code: '0102933000', name: 'Bario-an', type: 'residential', landmark: 'Bario-an Plaza & Basketball Court' },
    { code: '0102933005', psgc_code: '0102933005', municipality_code: '0102933000', name: 'Baritao', type: 'agricultural', landmark: 'Baritao Farm Access Road' },
    { code: '0102933006', psgc_code: '0102933006', municipality_code: '0102933000', name: 'Becques', type: 'coastal', landmark: 'Becques Coastal Access' },
    { code: '0102933007', psgc_code: '0102933007', municipality_code: '0102933000', name: 'Bimmanga', type: 'agricultural', landmark: 'Bimmanga Chapel' },
    { code: '0102933008', psgc_code: '0102933008', municipality_code: '0102933000', name: 'Bio', type: 'coastal', landmark: 'Bio Beach & Fisherfolk Landing' },
    { code: '0102933009', psgc_code: '0102933009', municipality_code: '0102933000', name: 'Bitalag', type: 'commercial', landmark: 'Bitalag McArthur Highway Junction' },
    { code: '0102933010', psgc_code: '0102933010', municipality_code: '0102933000', name: 'Borono', type: 'agricultural', landmark: 'Borono Community Center' },
    { code: '0102933011', psgc_code: '0102933011', municipality_code: '0102933000', name: 'Bucao East', type: 'residential', landmark: 'Bucao East Hall' },
    { code: '0102933012', psgc_code: '0102933012', municipality_code: '0102933000', name: 'Bucao West', type: 'residential', landmark: 'Bucao West Chapel' },
    { code: '0102933013', psgc_code: '0102933013', municipality_code: '0102933000', name: 'Cabaroan', type: 'agricultural', landmark: 'Cabaroan Irrigation Canal' },
    { code: '0102933014', psgc_code: '0102933014', municipality_code: '0102933000', name: 'Cabugbugan', type: 'residential', landmark: 'Cabugbugan Daycare Center' },
    { code: '0102933015', psgc_code: '0102933015', municipality_code: '0102933000', name: 'Cabulanglangan', type: 'agricultural', landmark: 'Cabulanglangan Access Trail' },
    { code: '0102933016', psgc_code: '0102933016', municipality_code: '0102933000', name: 'Dacutan', type: 'coastal', landmark: 'Dacutan Beachfront' },
    { code: '0102933017', psgc_code: '0102933017', municipality_code: '0102933000', name: 'Dardarat', type: 'coastal', landmark: 'Dardarat Fish Landing & Shore' },
    { code: '0102933018', psgc_code: '0102933018', municipality_code: '0102933000', name: 'Del Pilar', type: 'commercial', landmark: 'Del Pilar Municipal Plaza & Heritage Houses' },
    { code: '0102933019', psgc_code: '0102933019', municipality_code: '0102933000', name: 'Farola', type: 'coastal', landmark: 'Tagudin Historic Sundial & Farola Lighthouse' },
    { code: '0102933020', psgc_code: '0102933020', municipality_code: '0102933000', name: 'Gabur', type: 'agricultural', landmark: 'Gabur Fields & Chapel' },
    { code: '0102933021', psgc_code: '0102933021', municipality_code: '0102933000', name: 'Garitan', type: 'agricultural', landmark: 'Garitan Creek Bridge' },
    { code: '0102933022', psgc_code: '0102933022', municipality_code: '0102933000', name: 'Jardin', type: 'residential', landmark: 'Jardin Multi-Purpose Hall' },
    { code: '0102933023', psgc_code: '0102933023', municipality_code: '0102933000', name: 'Lacong', type: 'agricultural', landmark: 'Lacong Elementary School' },
    { code: '0102933024', psgc_code: '0102933024', municipality_code: '0102933000', name: 'Lantag', type: 'agricultural', landmark: 'Lantag Foothills' },
    { code: '0102933025', psgc_code: '0102933025', municipality_code: '0102933000', name: 'Las-ud', type: 'residential', landmark: 'Las-ud Chapel' },
    { code: '0102933026', psgc_code: '0102933026', municipality_code: '0102933000', name: 'Libtong', type: 'coastal', landmark: 'Libtong Cove & Sunset Beach' },
    { code: '0102933027', psgc_code: '0102933027', municipality_code: '0102933000', name: 'Lubnac', type: 'agricultural', landmark: 'Lubnac Barangay Center' },
    { code: '0102933028', psgc_code: '0102933028', municipality_code: '0102933000', name: 'Magsaysay', type: 'agricultural', landmark: 'Magsaysay Upland Sector' },
    { code: '0102933029', psgc_code: '0102933029', municipality_code: '0102933000', name: 'Malacañang', type: 'agricultural', landmark: 'Malacañang Community Hall' },
    { code: '0102933030', psgc_code: '0102933030', municipality_code: '0102933000', name: 'Pacac', type: 'agricultural', landmark: 'Pacac Agricultural Station' },
    { code: '0102933031', psgc_code: '0102933031', municipality_code: '0102933000', name: 'Pallogan', type: 'agricultural', landmark: 'Pallogan Chapel' },
    { code: '0102933032', psgc_code: '0102933032', municipality_code: '0102933000', name: 'Pula', type: 'agricultural', landmark: 'Pula Farming Area' },
    { code: '0102933033', psgc_code: '0102933033', municipality_code: '0102933000', name: 'Pudoc East', type: 'coastal', landmark: 'Pudoc East Amburayan River Mouth' },
    { code: '0102933034', psgc_code: '0102933034', municipality_code: '0102933000', name: 'Pudoc West', type: 'coastal', landmark: 'Pudoc West Fishery & Estuary' },
    { code: '0102933035', psgc_code: '0102933035', municipality_code: '0102933000', name: 'Quirino', type: 'commercial', landmark: 'Saint Augustine Parish & Church' },
    { code: '0102933036', psgc_code: '0102933036', municipality_code: '0102933000', name: 'Rang-et', type: 'agricultural', landmark: 'Rang-et Community Health Post' },
    { code: '0102933037', psgc_code: '0102933037', municipality_code: '0102933000', name: 'Rizal', type: 'commercial', landmark: 'Tagudin Public Market & Commercial District' },
    { code: '0102933038', psgc_code: '0102933038', municipality_code: '0102933000', name: 'Salvacion', type: 'agricultural', landmark: 'Salvacion Chapel' },
    { code: '0102933039', psgc_code: '0102933039', municipality_code: '0102933000', name: 'San Miguel', type: 'coastal', landmark: 'San Miguel Coast Guard Outpost' },
    { code: '0102933040', psgc_code: '0102933040', municipality_code: '0102933000', name: 'Sawat', type: 'agricultural', landmark: 'Sawat Riverbank' },
    { code: '0102933041', psgc_code: '0102933041', municipality_code: '0102933000', name: 'Tallaoen', type: 'agricultural', landmark: 'Tallaoen School' },
    { code: '0102933042', psgc_code: '0102933042', municipality_code: '0102933000', name: 'Tampugo', type: 'residential', landmark: 'Tampugo Junction' },
    { code: '0102933043', psgc_code: '0102933043', municipality_code: '0102933000', name: 'Tarangotong', type: 'agricultural', landmark: 'Tarangotong Upland Crossing' },
];

/**
 * Builds the canonical default geography for Tagudin Centro (Rizal / Public Market).
 */
export function buildDefaultTagudinGeography(addressLine1 = 'Tagudin Public Market, Rizal'): CanonicalGeography {
    return {
        version: 1,
        area_code: 'tagudin-centro',
        region_code: '0100000000',
        region_name: 'Ilocos Region (Region I)',
        province_code: '0102900000',
        province_name: 'Ilocos Sur',
        municipality_code: '0102933000',
        municipality_name: 'Tagudin',
        postal_code: '2714',
        barangay_code: '0102933037',
        barangay_name: 'Rizal',
        address_line_1: addressLine1,
        stall_location: addressLine1,
        landmark: 'Tagudin Public Market & Commercial District',
        coordinates: {
            lat: 16.9388,
            lng: 120.4439,
            accuracy_m: null,
            source: 'default',
            captured_at: null,
        },
        has_pinned_coordinates: false,
        service_radius_km: 15,
    };
}

/**
 * Normalizes raw input or legacy data into canonical Philippine geography.
 */
export function normalizeGeography(raw: unknown, fallbackAddress?: string): CanonicalGeography {
    const base = buildDefaultTagudinGeography(fallbackAddress || undefined);
    if (!raw || typeof raw !== 'object') {
        return base;
    }

    const obj = raw as Record<string, unknown>;
    const coordsObj = (obj.coordinates && typeof obj.coordinates === 'object' ? obj.coordinates : {}) as Record<string, unknown>;

    const lat = typeof coordsObj.lat === 'number' && Number.isFinite(coordsObj.lat) ? coordsObj.lat : base.coordinates.lat;
    const lng = typeof coordsObj.lng === 'number' && Number.isFinite(coordsObj.lng) ? coordsObj.lng : base.coordinates.lng;
    const accuracy_m = typeof coordsObj.accuracy_m === 'number' && Number.isFinite(coordsObj.accuracy_m) ? coordsObj.accuracy_m : null;
    const source: CoordinateSource = coordsObj.source === 'gps' || coordsObj.source === 'manual' ? coordsObj.source : 'default';
    const captured_at = typeof coordsObj.captured_at === 'string' ? coordsObj.captured_at : null;

    const bCode = typeof obj.barangay_code === 'string' && obj.barangay_code ? obj.barangay_code : base.barangay_code;
    const matchedBarangay = TAGUDIN_BARANGAYS_43.find((b) => b.code === bCode || b.name.toLowerCase() === String(obj.barangay_name || '').toLowerCase()) || TAGUDIN_BARANGAYS_43.find((b) => b.code === base.barangay_code) || TAGUDIN_BARANGAYS_43[0];

    const addr = typeof obj.address_line_1 === 'string' && obj.address_line_1.trim() ? obj.address_line_1.trim() : fallbackAddress || base.address_line_1;

    return {
        version: 1,
        area_code: typeof obj.area_code === 'string' && obj.area_code ? obj.area_code : base.area_code,
        region_code: typeof obj.region_code === 'string' && obj.region_code ? obj.region_code : base.region_code,
        region_name: typeof obj.region_name === 'string' && obj.region_name ? obj.region_name : base.region_name,
        province_code: typeof obj.province_code === 'string' && obj.province_code ? obj.province_code : base.province_code,
        province_name: typeof obj.province_name === 'string' && obj.province_name ? obj.province_name : base.province_name,
        municipality_code: typeof obj.municipality_code === 'string' && obj.municipality_code ? obj.municipality_code : base.municipality_code,
        municipality_name: typeof obj.municipality_name === 'string' && obj.municipality_name ? obj.municipality_name : base.municipality_name,
        postal_code: typeof obj.postal_code === 'string' && obj.postal_code ? obj.postal_code : base.postal_code,
        barangay_code: matchedBarangay.code,
        barangay_name: matchedBarangay.name,
        address_line_1: addr,
        stall_location: typeof obj.stall_location === 'string' ? obj.stall_location : addr,
        landmark: matchedBarangay.landmark,
        coordinates: {
            lat,
            lng,
            accuracy_m,
            source,
            captured_at,
        },
        has_pinned_coordinates: Boolean(obj.has_pinned_coordinates && source !== 'default'),
        service_radius_km: typeof obj.service_radius_km === 'number' && Number.isFinite(obj.service_radius_km) ? obj.service_radius_km : base.service_radius_km,
    };
}

/**
 * Formats canonical geography into a human-readable Philippine postal string.
 */
export function formatPhilippineAddress(geo: CanonicalGeography): string {
    const parts = [
        geo.address_line_1,
        `Brgy. ${geo.barangay_name}`,
        geo.municipality_name,
        geo.province_name,
        geo.postal_code,
    ].filter(Boolean);

    return parts.join(', ');
}
