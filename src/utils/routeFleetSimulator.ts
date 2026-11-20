import {getDistanceMeters} from '../data/barranquillaTransit';
import type {CompanyRouteItem} from '../data/busRoutesCatalog';
import type {LatLng} from '../types/transit';
import type {RouteDirectionMode} from '../components/BarranquillaMaps';

export interface RouteFleetBusMarker {
  id: string;
  routeId: string;
  code: string;
  company: string;
  color: string;
  direction: 'ida' | 'regreso' | 'loop';
  unitNumber: number;
  totalUnits: number;
  position: LatLng;
}

interface PreparedPath {
  points: LatLng[];
  cumDist: number[];
  totalMeters: number;
}

const preparedPathCache: Record<string, PreparedPath> = {};

function preparePolyline(cacheKey: string, points: LatLng[]): PreparedPath {
  const cached = preparedPathCache[cacheKey];
  if (cached) return cached;

  if (points.length === 0) {
    const empty = {points: [], cumDist: [0], totalMeters: 0};
    preparedPathCache[cacheKey] = empty;
    return empty;
  }

  const cumDist: number[] = [0];
  let totalMeters = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalMeters += getDistanceMeters(points[i], points[i + 1]);
    cumDist.push(totalMeters);
  }

  const prepared = {points, cumDist, totalMeters};
  preparedPathCache[cacheKey] = prepared;
  return prepared;
}

function samplePolylineAtDistance(prepared: PreparedPath, distMeters: number): LatLng {
  const {points, cumDist, totalMeters} = prepared;
  if (points.length === 0) return {lat: 10.9939, lng: -74.8069};
  if (points.length === 1 || totalMeters <= 0) return points[0];

  const wrapped = ((distMeters % totalMeters) + totalMeters) % totalMeters;

  // Binary search for segment containing `wrapped`
  let lo = 0;
  let hi = cumDist.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cumDist[mid] <= wrapped) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const d0 = cumDist[lo];
  const d1 = cumDist[lo + 1];
  const segLen = d1 - d0;
  const frac = segLen > 0 ? (wrapped - d0) / segLen : 0;
  const a = points[lo];
  const b = points[lo + 1];

  return {
    lat: a.lat + (b.lat - a.lat) * frac,
    lng: a.lng + (b.lng - a.lng) * frac,
  };
}

function hashRouteSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10000;
}

function getPrimaryIdaPath(route: CompanyRouteItem): LatLng[] {
  if (route.segments && route.segments.length > 0) {
    // Pick the longest valid segment as the continuous primary circuit, or flatten if needed
    let longest = route.segments[0];
    for (const seg of route.segments) {
      if (seg.length > longest.length) longest = seg;
    }
    if (longest.length >= 2) return longest;
  }
  return route.path;
}

function getBusCountForRoute(totalLengthMeters: number, seed: number): number {
  // Always strictly between 3 and 6 buses per route based on route length
  if (totalLengthMeters < 9500) return 3;
  if (totalLengthMeters < 16500) return 4;
  if (totalLengthMeters < 24500) return 5;
  return seed % 3 === 0 ? 5 : 6;
}

/**
 * Generates 3 to 6 live moving buses per route following the exact street polyline
 * of the route's Ida, Regreso, or continuous loop path.
 */
export function buildSimulatedRouteFleet(
  routes: CompanyRouteItem[],
  elapsedSeconds: number,
  selectedRouteId?: string | null,
  selectedDirectionMode: RouteDirectionMode = 'both'
): RouteFleetBusMarker[] {
  const markers: RouteFleetBusMarker[] = [];
  const BUS_SPEED_MPS = 22; // Smooth visible forward progression along the street trace

  for (const route of routes) {
    const idaPts = getPrimaryIdaPath(route);
    const hasReturn = route.returnPath.length >= 2;
    const idaPrepared = preparePolyline(`${route.id}::ida`, idaPts);
    const returnPrepared = hasReturn
      ? preparePolyline(`${route.id}::regreso`, route.returnPath)
      : null;

    const totalLen =
      idaPrepared.totalMeters + (returnPrepared ? returnPrepared.totalMeters : 0);
    if (totalLen <= 0) continue;

    const seed = hashRouteSeed(route.id);
    const totalUnits = getBusCountForRoute(totalLen, seed);
    const dirMode: RouteDirectionMode =
      selectedRouteId === route.id ? selectedDirectionMode : 'both';

    if (hasReturn && returnPrepared && returnPrepared.totalMeters > 0) {
      if (dirMode === 'ida') {
        for (let k = 0; k < totalUnits; k++) {
          const offset = (k / totalUnits) * idaPrepared.totalMeters;
          const dist = seed * 3.7 + elapsedSeconds * BUS_SPEED_MPS + offset;
          markers.push({
            id: `rbus-${route.id}-${k}`,
            routeId: route.id,
            code: route.code,
            company: route.company,
            color: route.color,
            direction: 'ida',
            unitNumber: k + 1,
            totalUnits,
            position: samplePolylineAtDistance(idaPrepared, dist),
          });
        }
      } else if (dirMode === 'regreso') {
        for (let k = 0; k < totalUnits; k++) {
          const offset = (k / totalUnits) * returnPrepared.totalMeters;
          const dist = seed * 5.1 + elapsedSeconds * BUS_SPEED_MPS + offset;
          markers.push({
            id: `rbus-${route.id}-${k}`,
            routeId: route.id,
            code: route.code,
            company: route.company,
            color: route.color,
            direction: 'regreso',
            unitNumber: k + 1,
            totalUnits,
            position: samplePolylineAtDistance(returnPrepared, dist),
          });
        }
      } else {
        // Split 3..6 buses cleanly across Ida and Vuelta
        const idaCount = Math.ceil(totalUnits / 2);
        const returnCount = totalUnits - idaCount;
        for (let k = 0; k < idaCount; k++) {
          const offset = (k / idaCount) * idaPrepared.totalMeters;
          const dist = seed * 3.7 + elapsedSeconds * BUS_SPEED_MPS + offset;
          markers.push({
            id: `rbus-${route.id}-${k}`,
            routeId: route.id,
            code: route.code,
            company: route.company,
            color: route.color,
            direction: 'ida',
            unitNumber: k + 1,
            totalUnits,
            position: samplePolylineAtDistance(idaPrepared, dist),
          });
        }
        for (let k = 0; k < returnCount; k++) {
          const offset = (k / returnCount) * returnPrepared.totalMeters;
          const dist = seed * 5.1 + elapsedSeconds * BUS_SPEED_MPS + offset;
          markers.push({
            id: `rbus-${route.id}-${idaCount + k}`,
            routeId: route.id,
            code: route.code,
            company: route.company,
            color: route.color,
            direction: 'regreso',
            unitNumber: idaCount + k + 1,
            totalUnits,
            position: samplePolylineAtDistance(returnPrepared, dist),
          });
        }
      }
    } else if (idaPrepared.totalMeters > 0) {
      for (let k = 0; k < totalUnits; k++) {
        const offset = (k / totalUnits) * idaPrepared.totalMeters;
        const dist = seed * 4.3 + elapsedSeconds * BUS_SPEED_MPS + offset;
        markers.push({
          id: `rbus-${route.id}-${k}`,
          routeId: route.id,
          code: route.code,
          company: route.company,
          color: route.color,
          direction: 'loop',
          unitNumber: k + 1,
          totalUnits,
          position: samplePolylineAtDistance(idaPrepared, dist),
        });
      }
    }
  }

  return markers;
}
