import type {
  DriverStop,
  FleetBus,
  LatLng,
  MapBounds,
  OperationalIncident,
  RouteCardItem,
  ScreenId,
  TransitStation,
  WalletTransaction,
} from '../types/transit';

export const NATIVE_DEVICE_BY_SCREEN: Record<ScreenId, 'movil' | 'tablet' | 'desktop'> = {
  mapa: 'movil',
  rutas: 'movil',
  billetera: 'movil',
  conductor: 'tablet',
  operador: 'desktop',
};

// Estadio Romelio Martínez / Calle 72 con Cra 46, Barranquilla
export const BARRANQUILLA_PASSENGER_CENTER: LatLng = {
  lat: 10.9939,
  lng: -74.8069,
};

export const BARRANQUILLA_FLEET_CENTER: LatLng = {
  lat: 10.9915,
  lng: -74.8035,
};

export const USER_GPS_POSITION: LatLng = {
  lat: 10.9953,
  lng: -74.8074,
};

export const TRANSIT_STATIONS: TransitStation[] = [
  {
    id: 'la-catorce',
    name: 'Estación La Catorce',
    subtitle: 'Troncal Cra 46 con Calle 72',
    position: {lat: 10.9939, lng: -74.8069},
    isPrimary: true,
    arrivals: [
      {route: 'T-01', label: 'T-01 Troncal', minutes: 2, busId: 'Bus #B-304', category: 'troncal'},
      {route: 'T-02', label: 'T-02 Retorno', minutes: 8, busId: 'Bus #B-108', category: 'troncal'},
      {route: 'A-12', label: 'A-12 Bosque', minutes: 6, busId: 'Bus #B-118', category: 'alimentador'},
    ],
  },
  {
    id: 'esthercita',
    name: 'Esthercita Forero',
    subtitle: 'Troncal Cra 46 con Calle 70',
    position: {lat: 10.9922, lng: -74.8056},
    isPrimary: false,
    arrivals: [
      {route: 'T-01', label: 'T-01 Troncal', minutes: 4, busId: 'Bus #B-304', category: 'troncal'},
      {route: 'A-12', label: 'A-12 Alimentador', minutes: 5, busId: 'Bus #B-118', category: 'alimentador'},
    ],
  },
  {
    id: 'portal-prado',
    name: 'Estación Portal del Prado',
    subtitle: 'Calle 53 con Cra 46',
    position: {lat: 10.9889, lng: -74.7945},
    isPrimary: false,
    arrivals: [
      {route: 'T-01', label: 'T-01 Troncal', minutes: 7, busId: 'Bus #B-304', category: 'troncal'},
      {route: 'E-03', label: 'E-03 Expreso', minutes: 3, busId: 'Bus #B-205', category: 'expreso'},
    ],
  },
];

// Real arterial corridors in Barranquilla (Cra 46 Troncal, Calle 72, Vía 40, Calle 45 Murillo)
export const CORRIDOR_POLYLINES: Array<{
  id: string;
  name: string;
  color: string;
  weight: number;
  opacity: number;
  path: LatLng[];
}> = [
  {
    id: 'troncal-cra-46',
    name: 'Troncal Cra 46 (Olaya Herrera)',
    color: '#2563EB',
    weight: 5,
    opacity: 0.88,
    path: [
      {lat: 11.0065, lng: -74.8152},
      {lat: 10.9992, lng: -74.8104},
      {lat: 10.9953, lng: -74.8074},
      {lat: 10.9939, lng: -74.8069},
      {lat: 10.9922, lng: -74.8056},
      {lat: 10.9889, lng: -74.7945},
      {lat: 10.9822, lng: -74.7832},
    ],
  },
  {
    id: 'calle-72',
    name: 'Corredor Calle 72',
    color: '#64748B',
    weight: 4,
    opacity: 0.72,
    path: [
      {lat: 10.9901, lng: -74.8155},
      {lat: 10.9939, lng: -74.8069},
      {lat: 10.9974, lng: -74.7988},
      {lat: 11.0005, lng: -74.7918},
    ],
  },
  {
    id: 'alimentador-a12',
    name: 'Alimentador A-12 (Circunvalar - Cra 46)',
    color: '#16A34A',
    weight: 4,
    opacity: 0.85,
    path: [
      {lat: 10.9968, lng: -74.8158},
      {lat: 10.9934, lng: -74.8108},
      {lat: 10.9922, lng: -74.8056},
      {lat: 10.9902, lng: -74.8024},
    ],
  },
  {
    id: 'murillo-e03',
    name: 'Troncal Murillo (Calle 45)',
    color: '#DC2626',
    weight: 4,
    opacity: 0.82,
    path: [
      {lat: 10.9685, lng: -74.8105},
      {lat: 10.9742, lng: -74.7995},
      {lat: 10.9801, lng: -74.7888},
      {lat: 10.9848, lng: -74.7805},
    ],
  },
];

export const INITIAL_ROUTE_CARDS: RouteCardItem[] = [
  {
    id: 'T-01',
    code: 'T-01',
    category: 'troncal',
    name: 'Portal Norte a Paseo Bolívar',
    busId: 'Bus #B-304',
    corridor: 'Cra 46',
    etaMinutes: 2,
    nextMinutes: 9,
    occupancyPct: 42,
    fareCop: 3100,
  },
  {
    id: 'A-12',
    code: 'A-12',
    category: 'alimentador',
    name: 'Circunvalar a Retorno',
    busId: 'Bus #B-118',
    corridor: 'Calle 70',
    etaMinutes: 6,
    nextMinutes: 14,
    occupancyPct: 18,
    fareCop: 3100,
    amenities: 'Aire Acondicionado',
  },
];

export const INITIAL_FLEET_BUSES: FleetBus[] = [
  {
    id: 'B-304',
    routeCode: 'T-01',
    routeLabel: 'T-01 Troncal',
    category: 'troncal',
    driver: 'Carlos E. Mendoza',
    paxCurrent: 34,
    paxMax: 80,
    revenueCop: 967200,
    status: 'Normal',
    position: {lat: 10.9946, lng: -74.8072},
    etaLabel: '2 min',
  },
  {
    id: 'B-118',
    routeCode: 'A-12',
    routeLabel: 'A-12 Alimentador',
    category: 'alimentador',
    driver: 'Javier Polo Peña',
    paxCurrent: 9,
    paxMax: 50,
    revenueCop: 421600,
    status: 'Normal',
    position: {lat: 10.9918, lng: -74.8091},
    etaLabel: '6 min',
  },
  {
    id: 'B-205',
    routeCode: 'E-03',
    routeLabel: 'E-03 Expreso',
    category: 'expreso',
    driver: 'María F. Gómez',
    paxCurrent: 69,
    paxMax: 80,
    revenueCop: 1829000,
    status: 'Demora +6 min',
    hasDelay: true,
    position: {lat: 10.9985, lng: -74.7975},
    etaLabel: '+6m Retraso',
  },
];

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx-1',
    type: 'trip',
    title: 'Ruta T-01 • Est. La Catorce',
    subtitle: 'Hoy, 10:14 AM • QR Bus #B-304',
    amountCop: -3100,
  },
  {
    id: 'tx-2',
    type: 'topup',
    title: 'Recarga Nequi Bancolombia',
    subtitle: 'Ayer, 04:30 PM • Ref #9281',
    amountCop: 20000,
  },
  {
    id: 'tx-3',
    type: 'transfer',
    title: 'Transbordo Alimentador A-12',
    subtitle: 'Ayer, 05:12 PM • Ventana 45m',
    amountCop: 0,
  },
];

export const INITIAL_INCIDENTS: OperationalIncident[] = [
  {
    id: 'inc-1',
    severity: 'warning',
    title: 'Congestión Vehicular • Vía 40',
    timeAgo: 'Hace 8 min',
    description:
      'Afectación en retorno C76 a Portal Norte. Rutas A-04 y T-01 presentan demora estimada de 6 a 9 min.',
    actions: ['divert', 'cameras'],
  },
  {
    id: 'inc-2',
    severity: 'info',
    title: 'Validador Offline • Bus #B-142',
    timeAgo: 'Hace 18 min',
    description:
      'Vehículo opera en contingencia fuera de línea. 14 transacciones en cola sincronizadas localmente.',
  },
];

export const DRIVER_ROUTE_STOPS: DriverStop[] = [
  {
    name: 'Portal Norte',
    corridor: 'Cra 46 con Calle 93',
    scheduledTime: '10:05 AM',
    distanceMeters: 0,
  },
  {
    name: 'Joe Arroyo',
    corridor: 'Cra 46 con Calle 74',
    scheduledTime: '10:12 AM',
    distanceMeters: 420,
  },
  {
    name: 'Esthercita Forero',
    corridor: 'Cra 46 con Calle 70',
    scheduledTime: '10:18 AM',
    distanceMeters: 310,
  },
  {
    name: 'Estación La Catorce',
    corridor: 'Cra 46 con Calle 72 • Troncal Olaya Herrera',
    scheduledTime: '10:26 AM',
    distanceMeters: 280,
  },
  {
    name: 'Portal del Prado',
    corridor: 'Cra 46 con Calle 53',
    scheduledTime: '10:32 AM',
    distanceMeters: 640,
  },
  {
    name: 'Catedral Metropolitana',
    corridor: 'Cra 45 con Calle 53',
    scheduledTime: '10:39 AM',
    distanceMeters: 520,
  },
  {
    name: 'Paseo Bolívar',
    corridor: 'Calle 34 con Cra 44 • Centro',
    scheduledTime: '10:48 AM',
    distanceMeters: 780,
  },
];

export function formatCOP(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('es-CO');
}

const EARTH_RADIUS_M = 6371000;

export function getDistanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const latFactor = 111320;
  const lngFactor = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lng - p.lng) * lngFactor;
  const ay = (a.lat - p.lat) * latFactor;
  const bx = (b.lng - p.lng) * lngFactor;
  const by = (b.lat - p.lat) * latFactor;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(ax, ay);
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(cx, cy);
}

export function getDistanceToPolylineMeters(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return getDistanceMeters(point, path[0]);
  let minDist = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = pointToSegmentMeters(point, path[i], path[i + 1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function isPointInBounds(pt: LatLng, bounds: MapBounds): boolean {
  return (
    pt.lat <= bounds.north &&
    pt.lat >= bounds.south &&
    pt.lng <= bounds.east &&
    pt.lng >= bounds.west
  );
}

export function routeIntersectsBounds(
  center: LatLng,
  path: LatLng[],
  bounds: MapBounds
): boolean {
  if (isPointInBounds(center, bounds)) return true;
  for (const pt of path) {
    if (isPointInBounds(pt, bounds)) return true;
  }
  return false;
}

export function formatDistanceLabel(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
