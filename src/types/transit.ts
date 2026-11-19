export type ScreenId = 'rutas' | 'billetera' | 'qr' | 'conductor' | 'operador';

export type DeviceMode = 'movil' | 'tablet' | 'desktop';

export type RouteCategory = 'troncal' | 'alimentador' | 'expreso';

export type RouteFilter = 'all' | 'troncal' | 'alimentador';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PlacePoint {
  name: string;
  address: string;
  position: LatLng;
}

export interface TripPlannerState {
  originQuery: string;
  originMarker: PlacePoint | null;
  destQuery: string;
  selectedDestination: PlacePoint | null;
  userPosition: LatLng;
  tripSubmittedNonce: number;
  setOriginQuery: (value: string) => void;
  setOriginMarker: (point: PlacePoint | null) => void;
  setDestQuery: (value: string) => void;
  setSelectedDestination: (point: PlacePoint | null) => void;
  onUpdateUserPosition: (pos: LatLng) => void;
  onFocusMap: (pos: LatLng, zoom?: number) => void;
  onTripSubmitted: () => void;
  onToast: (msg: string) => void;
}

export interface TransitStation {
  id: string;
  name: string;
  subtitle: string;
  position: LatLng;
  isPrimary?: boolean;
  arrivals: Array<{
    route: string;
    label: string;
    minutes: number;
    busId: string;
    category: RouteCategory;
  }>;
}

export interface RouteCardItem {
  id: string;
  code: string;
  category: RouteCategory;
  name: string;
  busId: string;
  corridor: string;
  etaMinutes: number;
  nextMinutes: number;
  occupancyPct: number;
  fareCop: number;
  amenities?: string;
}

export interface FleetBus {
  id: string;
  routeCode: string;
  routeLabel: string;
  category: RouteCategory;
  driver: string;
  paxCurrent: number;
  paxMax: number;
  revenueCop: number;
  status: string;
  hasDelay?: boolean;
  position: LatLng;
  etaLabel: string;
}

export interface WalletTransaction {
  id: string;
  type: 'trip' | 'topup' | 'transfer';
  title: string;
  subtitle: string;
  amountCop: number;
}

export interface OperationalIncident {
  id: string;
  severity: 'warning' | 'critical' | 'info';
  title: string;
  timeAgo: string;
  description: string;
  actions?: Array<'divert' | 'cameras'>;
}

export interface DriverStop {
  name: string;
  corridor: string;
  scheduledTime: string;
  distanceMeters: number;
}
