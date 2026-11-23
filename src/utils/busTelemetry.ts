import {
  INITIAL_FLEET_BUSES,
  INITIAL_ROUTE_CARDS,
  TRANSIT_STATIONS,
  formatDistanceLabel,
  getDistanceMeters,
} from '../data/barranquillaTransit';
import {COMPANY_BUS_ROUTES, type CompanyRouteItem} from '../data/busRoutesCatalog';
import type {LatLng} from '../types/transit';
import type {RouteFleetBusMarker} from './routeFleetSimulator';

export type SelectedBusTarget =
  | {kind: 'transmetro'; code: 'T-01' | 'A-12'}
  | {kind: 'nearby'; routeId: string}
  | {
      kind: 'route';
      busId: string;
      routeId: string;
      unitNumber: number;
      totalUnits: number;
      direction: 'ida' | 'regreso' | 'loop';
    };

export interface SelectedBusDetails {
  key: string;
  routeId: string | null;
  routeCode: string;
  routeName: string;
  company: string;
  unitLabel: string;
  plate: string;
  directionLabel: string;
  position: LatLng;
  fareCop: number;
  occupancyPct: number;
  occupancyLevel: 'low' | 'medium' | 'high';
  occupancyLabel: string;
  occupancyHint: string;
  passengersCurrent: number;
  passengersCapacity: number;
  seatsAvailable: number;
  etaMinutes: number;
  busDistanceMeters: number;
  pickupDistanceMeters: number;
  pickupPointName: string;
  isCustomPickup: boolean;
  speedKmh: number;
  nextStopName: string;
  frequencyLabel: string;
  serviceStatus: string;
  hasAc: boolean;
  hasAccessibility: boolean;
  routeRef: CompanyRouteItem | null;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildPlate(seed: number, isTransmetro: boolean): string {
  const letters = isTransmetro
    ? ['TZN', 'BAQ', 'TMO', 'SOU'][seed % 4]
    : ['WEY', 'SJR', 'UPX', 'TDQ', 'VKL'][seed % 5];
  const digits = 100 + (seed % 899);
  return `${letters}-${digits}`;
}

function classifyOccupancy(pct: number): {
  level: 'low' | 'medium' | 'high';
  label: string;
  hint: string;
} {
  if (pct <= 45) {
    return {
      level: 'low',
      label: 'Ocupación baja',
      hint: 'Varios asientos disponibles',
    };
  }
  if (pct <= 75) {
    return {
      level: 'medium',
      label: 'Ocupación media',
      hint: 'Asientos limitados',
    };
  }
  return {
    level: 'high',
    label: 'Ocupación alta',
    hint: 'Mayoría de pasajeros de pie',
  };
}

function findNearestPointOnPath(
  origin: LatLng,
  path: LatLng[]
): {point: LatLng; distanceMeters: number} | null {
  if (path.length === 0) return null;
  let bestPoint = path[0];
  let bestDist = getDistanceMeters(origin, path[0]);
  for (let i = 1; i < path.length; i++) {
    const d = getDistanceMeters(origin, path[i]);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = path[i];
    }
  }
  return {point: bestPoint, distanceMeters: bestDist};
}

function findNearestStation(pos: LatLng): {name: string; subtitle: string; dist: number} {
  let best = {
    name: TRANSIT_STATIONS[0].name,
    subtitle: TRANSIT_STATIONS[0].subtitle,
    dist: getDistanceMeters(pos, TRANSIT_STATIONS[0].position),
  };
  for (let i = 1; i < TRANSIT_STATIONS.length; i++) {
    const st = TRANSIT_STATIONS[i];
    const d = getDistanceMeters(pos, st.position);
    if (d < best.dist) {
      best = {name: st.name, subtitle: st.subtitle, dist: d};
    }
  }
  return best;
}

function resolvePickupPointLabel(
  boardingPos: LatLng,
  corridor: string,
  customOriginName: string | null,
  barrios: string[]
): string {
  const nearestSt = findNearestStation(boardingPos);
  if (nearestSt.dist <= 320) {
    return `${nearestSt.name} (${nearestSt.subtitle})`;
  }
  if (customOriginName) {
    return `Paradero cercano a ${customOriginName}`;
  }
  if (corridor && !corridor.startsWith('Recorrido oficial')) {
    return `Corredor ${corridor}`;
  }
  if (barrios.length > 0) {
    return `Sector ${barrios[0]}`;
  }
  return 'Paradero sobre tu corredor cercano';
}

export interface NearbyCompanyBusEntry {
  route: CompanyRouteItem;
  liveBusPos: LatLng;
  distanceMeters: number;
  busDistanceMeters: number;
  liveEta: number;
}

export function buildSelectedBusDetails(params: {
  target: SelectedBusTarget | null;
  activeOrigin: LatLng;
  originName: string | null;
  tick: number;
  busT01Position: LatLng;
  busA12Position: LatLng;
  nearbyCompanyRoutes: NearbyCompanyBusEntry[];
  routeBuses: RouteFleetBusMarker[];
}): SelectedBusDetails | null {
  const {
    target,
    activeOrigin,
    originName,
    tick,
    busT01Position,
    busA12Position,
    nearbyCompanyRoutes,
    routeBuses,
  } = params;

  if (!target) return null;

  const isCustomPickup = Boolean(originName);

  // 1. Transmetro featured buses (T-01 / A-12)
  if (target.kind === 'transmetro') {
    const isT01 = target.code === 'T-01';
    const card =
      INITIAL_ROUTE_CARDS.find((r) => r.code === target.code) ?? INITIAL_ROUTE_CARDS[0];
    const fleet =
      INITIAL_FLEET_BUSES.find((b) => b.routeCode === target.code) ?? INITIAL_FLEET_BUSES[0];
    const position = isT01 ? busT01Position : busA12Position;
    const busDistanceMeters = Math.round(getDistanceMeters(activeOrigin, position));
    const nearestStation = findNearestStation(activeOrigin);
    const pickupDistanceMeters = Math.round(nearestStation.dist);
    const etaMinutes = Math.max(
      1,
      Math.min(20, Math.round(busDistanceMeters / 160) || card.etaMinutes)
    );

    const paxCurrent = Math.min(
      fleet.paxMax,
      Math.max(1, fleet.paxCurrent + ((tick % 5) - 2))
    );
    const occupancyPct = Math.round((paxCurrent / fleet.paxMax) * 100);
    const occ = classifyOccupancy(occupancyPct);
    const speedKmh = 24 + ((tick + (isT01 ? 3 : 7)) % 9);

    const matchedRoute =
      COMPANY_BUS_ROUTES.find(
        (r) =>
          r.company === 'Transmetro' &&
          r.code.toUpperCase().replace(/[^A-Z0-9]/g, '') ===
            target.code.replace(/[^A-Z0-9]/g, '')
      ) ?? null;

    const nextStation = findNearestStation(position);

    return {
      key: target.code,
      routeId: matchedRoute?.id ?? null,
      routeCode: card.code,
      routeName: card.name,
      company: 'Transmetro',
      unitLabel: card.busId,
      plate: buildPlate(hashSeed(card.busId), true),
      directionLabel: isT01 ? 'Troncal Cra 46' : 'Alimentador Calle 70',
      position,
      fareCop: card.fareCop,
      occupancyPct,
      occupancyLevel: occ.level,
      occupancyLabel: occ.label,
      occupancyHint: occ.hint,
      passengersCurrent: paxCurrent,
      passengersCapacity: fleet.paxMax,
      seatsAvailable: Math.max(0, fleet.paxMax - paxCurrent),
      etaMinutes,
      busDistanceMeters,
      pickupDistanceMeters,
      pickupPointName:
        pickupDistanceMeters <= 600
          ? `${nearestStation.name} (${formatDistanceLabel(pickupDistanceMeters)})`
          : `Corredor ${card.corridor}`,
      isCustomPickup,
      speedKmh,
      nextStopName: nextStation.name,
      frequencyLabel: isT01 ? 'Cada 6-8 min' : 'Cada 8-10 min',
      serviceStatus: fleet.hasDelay ? fleet.status : 'En recorrido · A tiempo',
      hasAc: true,
      hasAccessibility: true,
      routeRef: matchedRoute,
    };
  }

  // 2. Nearby company buses OR route-fleet buses
  let route: CompanyRouteItem | undefined;
  let position: LatLng;
  let unitLabel: string;
  let directionLabel: string;
  let key: string;
  let seedKey: string;
  let precomputedEta: number | null = null;
  let activePath: LatLng[] = [];

  if (target.kind === 'nearby') {
    const entry = nearbyCompanyRoutes.find((item) => item.route.id === target.routeId);
    route =
      entry?.route ?? COMPANY_BUS_ROUTES.find((r) => r.id === target.routeId);
    if (!route) return null;
    position = entry?.liveBusPos ?? route.center;
    precomputedEta = entry?.liveEta ?? null;
    key = `bus-${route.id}`;
    seedKey = key;
    unitLabel = `Unidad #${(hashSeed(route.id) % 5) + 1}`;
    directionLabel = route.returnPath.length >= 2 ? 'Ida + Vuelta' : 'Recorrido oficial';
    activePath = route.path;
  } else {
    const fleetBus = routeBuses.find((b) => b.id === target.busId);
    route = COMPANY_BUS_ROUTES.find((r) => r.id === target.routeId);
    if (!route) return null;
    position = fleetBus?.position ?? route.center;
    key = target.busId;
    seedKey = `${route.id}-${target.unitNumber}`;
    unitLabel = `Bus #${target.unitNumber} de ${target.totalUnits}`;
    directionLabel =
      target.direction === 'regreso'
        ? 'Sentido Vuelta'
        : target.direction === 'ida'
        ? 'Sentido Ida'
        : 'Recorrido continuo';
    activePath =
      target.direction === 'regreso' && route.returnPath.length >= 2
        ? route.returnPath
        : route.path;
  }

  const seed = hashSeed(seedKey);
  const isTransmetro = route.company === 'Transmetro';
  const capacity = isTransmetro ? 80 : 44 + (seed % 7); // 44..50 pax
  const baseOccPct = 22 + (seed % 64); // 22%..85%
  const drift = ((Math.floor(tick / 3) + seed) % 5) - 2; // gentle +/-2 pax
  const passengersCurrent = Math.min(
    capacity,
    Math.max(4, Math.round((baseOccPct / 100) * capacity) + drift)
  );
  const occupancyPct = Math.round((passengersCurrent / capacity) * 100);
  const occ = classifyOccupancy(occupancyPct);

  const nearestBoarding = findNearestPointOnPath(
    activeOrigin,
    activePath.length > 0 ? activePath : route.path
  );
  const pickupPoint = nearestBoarding?.point ?? activeOrigin;
  const pickupDistanceMeters = Math.round(nearestBoarding?.distanceMeters ?? 0);
  const busDistanceMeters = Math.round(getDistanceMeters(activeOrigin, position));
  const busToPickupMeters = Math.round(getDistanceMeters(position, pickupPoint));

  const etaMinutes =
    precomputedEta ??
    Math.max(1, Math.min(25, Math.round(busToPickupMeters / 215)));

  const speedKmh = 21 + ((seed + tick) % 14); // 21..34 km/h
  const hasDelay = seed % 7 === 0;
  const delayMin = 3 + (seed % 4);
  const nextStopName =
    route.barriosCubiertos.length > 0
      ? route.barriosCubiertos[(seed + Math.floor(tick / 6)) % route.barriosCubiertos.length]
      : target.kind === 'route' && target.direction === 'regreso'
      ? route.startPoint.name
      : route.endPoint.name;

  return {
    key,
    routeId: route.id,
    routeCode: route.code,
    routeName: route.name,
    company: route.company,
    unitLabel,
    plate: buildPlate(seed, isTransmetro),
    directionLabel,
    position,
    fareCop: route.fareCop,
    occupancyPct,
    occupancyLevel: occ.level,
    occupancyLabel: occ.label,
    occupancyHint: occ.hint,
    passengersCurrent,
    passengersCapacity: capacity,
    seatsAvailable: Math.max(0, capacity - passengersCurrent),
    etaMinutes,
    busDistanceMeters,
    pickupDistanceMeters,
    pickupPointName: resolvePickupPointLabel(
      pickupPoint,
      route.corridor,
      originName,
      route.barriosCubiertos
    ),
    isCustomPickup,
    speedKmh,
    nextStopName,
    frequencyLabel: isTransmetro ? 'Cada 6-10 min' : 'Cada 8-14 min',
    serviceStatus: hasDelay ? `Demora leve +${delayMin} min` : 'En recorrido · A tiempo',
    hasAc: isTransmetro || seed % 3 !== 0,
    hasAccessibility: isTransmetro || seed % 4 === 0,
    routeRef: route,
  };
}
