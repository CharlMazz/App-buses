import {getDistanceMeters} from '../data/barranquillaTransit';
import type {CompanyRouteItem} from '../data/busRoutesCatalog';
import type {LatLng} from '../types/transit';
import type {RouteDirectionMode} from '../components/BarranquillaMaps';

export interface PolylineProjection {
  segmentIndex: number;
  t: number;
  progress: number;
  distanceMeters: number;
  point: LatLng;
  cumDistMeters: number;
}

export interface DirectTripMatch {
  route: CompanyRouteItem;
  directionMode: RouteDirectionMode;
  directionLabel: string;
  originWalkMeters: number;
  destWalkMeters: number;
  totalWalkMeters: number;
  rideMeters: number;
  estimatedRideMinutes: number;
  boardingPoint: LatLng;
  alightingPoint: LatLng;
  score: number;
  isExtendedWalk: boolean;
}

export interface TransferTripMatch {
  id: string;
  firstLeg: CompanyRouteItem;
  firstDirection: RouteDirectionMode;
  secondLeg: CompanyRouteItem;
  secondDirection: RouteDirectionMode;
  originWalkMeters: number;
  transferWalkMeters: number;
  destWalkMeters: number;
  totalWalkMeters: number;
  transferPoint: LatLng;
  score: number;
}

export interface TripMatchResult {
  direct: DirectTripMatch[];
  transfers: TransferTripMatch[];
  hasExtendedWalkOnly: boolean;
}

interface SegmentProjection {
  segmentIndex: number;
  t: number;
  progress: number;
  distanceMeters: number;
  point: LatLng;
  cumDistMeters: number;
}

function projectPointToSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng,
  segmentIndex: number,
  cumDistStart: number,
  segLengthMeters: number
): SegmentProjection {
  const latFactor = 111320;
  const lngFactor = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lng - p.lng) * lngFactor;
  const ay = (a.lat - p.lat) * latFactor;
  const bx = (b.lng - p.lng) * lngFactor;
  const by = (b.lat - p.lat) * latFactor;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;

  return {
    segmentIndex,
    t,
    progress: segmentIndex + t,
    distanceMeters: Math.hypot(cx, cy),
    point: {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    },
    cumDistMeters: cumDistStart + t * segLengthMeters,
  };
}

function computeCumulativeDistances(path: LatLng[]): {
  segLengths: number[];
  cumDistAtVertex: number[];
  totalLength: number;
} {
  const segLengths: number[] = [];
  const cumDistAtVertex: number[] = [0];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = getDistanceMeters(path[i], path[i + 1]);
    segLengths.push(len);
    total += len;
    cumDistAtVertex.push(total);
  }
  return {segLengths, cumDistAtVertex, totalLength: total};
}

/**
 * Finds the best ordered pair (boarding -> alighting) along a single directed polyline
 * minimizing (originWalk + destWalk) while ensuring boarding comes before alighting.
 */
function findBestOrderedPairOnPath(
  origin: LatLng,
  destination: LatLng,
  path: LatLng[],
  allowWrapAroundLoop: boolean
): {
  originProj: SegmentProjection;
  destProj: SegmentProjection;
  rideMeters: number;
} | null {
  if (path.length < 2) return null;

  const {segLengths, cumDistAtVertex, totalLength} = computeCumulativeDistances(path);
  const segCount = path.length - 1;

  const origProjs: SegmentProjection[] = new Array(segCount);
  const destProjs: SegmentProjection[] = new Array(segCount);

  for (let i = 0; i < segCount; i++) {
    origProjs[i] = projectPointToSegment(
      origin,
      path[i],
      path[i + 1],
      i,
      cumDistAtVertex[i],
      segLengths[i]
    );
    destProjs[i] = projectPointToSegment(
      destination,
      path[i],
      path[i + 1],
      i,
      cumDistAtVertex[i],
      segLengths[i]
    );
  }

  let bestOriginSoFar: SegmentProjection = origProjs[0];
  let bestPair: {
    originProj: SegmentProjection;
    destProj: SegmentProjection;
    rideMeters: number;
    walkSum: number;
  } | null = null;

  // Forward pass (boarding <= alighting along the path)
  for (let j = 0; j < segCount; j++) {
    const candOrig = origProjs[j];
    const candDest = destProjs[j];

    // Update running minimum of origin walk distance before/at segment j
    if (candOrig.distanceMeters < bestOriginSoFar.distanceMeters) {
      bestOriginSoFar = candOrig;
    }

    // Use best origin strictly before j, OR on segment j if origin t <= dest t + 0.05
    const usableOrigin =
      bestOriginSoFar.segmentIndex < j || bestOriginSoFar.t <= candDest.t + 0.05
        ? bestOriginSoFar
        : candOrig.t <= candDest.t + 0.05
        ? candOrig
        : null;

    if (!usableOrigin) continue;

    const rideMeters = Math.max(0, candDest.cumDistMeters - usableOrigin.cumDistMeters);
    const walkSum = usableOrigin.distanceMeters + candDest.distanceMeters;

    if (
      !bestPair ||
      walkSum < bestPair.walkSum - 1 ||
      (Math.abs(walkSum - bestPair.walkSum) <= 1 && rideMeters < bestPair.rideMeters)
    ) {
      bestPair = {
        originProj: usableOrigin,
        destProj: candDest,
        rideMeters,
        walkSum,
      };
    }
  }

  // If route is a closed loop, also evaluate wrapping across the terminal seam (end -> 0)
  if (allowWrapAroundLoop && segCount >= 4) {
    let bestGlobalDestPrefix: SegmentProjection = destProjs[0];
    // Suffix minimum of origin (from end of path) paired with prefix minimum of dest (from start)
    const prefixBestDest: SegmentProjection[] = new Array(segCount);
    prefixBestDest[0] = destProjs[0];
    for (let k = 1; k < segCount; k++) {
      prefixBestDest[k] =
        destProjs[k].distanceMeters < bestGlobalDestPrefix.distanceMeters
          ? destProjs[k]
          : bestGlobalDestPrefix;
      bestGlobalDestPrefix = prefixBestDest[k];
    }

    for (let i = 1; i < segCount; i++) {
      const candOrig = origProjs[i];
      const candDest = prefixBestDest[i - 1];
      const rideMeters = Math.max(
        0,
        totalLength - candOrig.cumDistMeters + candDest.cumDistMeters
      );
      const walkSum = candOrig.distanceMeters + candDest.distanceMeters;

      if (
        !bestPair ||
        walkSum < bestPair.walkSum - 1 ||
        (Math.abs(walkSum - bestPair.walkSum) <= 1 && rideMeters < bestPair.rideMeters)
      ) {
        bestPair = {
          originProj: candOrig,
          destProj: candDest,
          rideMeters,
          walkSum,
        };
      }
    }
  }

  if (!bestPair) return null;
  return {
    originProj: bestPair.originProj,
    destProj: bestPair.destProj,
    rideMeters: bestPair.rideMeters,
  };
}

function findClosestPointOnSegments(
  point: LatLng,
  segments: LatLng[][]
): SegmentProjection | null {
  let best: SegmentProjection | null = null;
  for (const seg of segments) {
    if (seg.length < 2) continue;
    const {segLengths, cumDistAtVertex} = computeCumulativeDistances(seg);
    for (let i = 0; i < seg.length - 1; i++) {
      const proj = projectPointToSegment(
        point,
        seg[i],
        seg[i + 1],
        i,
        cumDistAtVertex[i],
        segLengths[i]
      );
      if (!best || proj.distanceMeters < best.distanceMeters) {
        best = proj;
      }
    }
  }
  return best;
}

function evaluateRouteDirect(
  route: CompanyRouteItem,
  origin: LatLng,
  destination: LatLng
): Omit<DirectTripMatch, 'isExtendedWalk'> | null {
  const hasSeparateReturn = route.returnPath.length >= 2;
  const hasMultiSegments = Boolean(route.segments && route.segments.length > 1);

  type Candidate = {
    directionMode: RouteDirectionMode;
    directionLabel: string;
    originProj: SegmentProjection;
    destProj: SegmentProjection;
    rideMeters: number;
    walkSum: number;
  };

  const candidates: Candidate[] = [];

  if (route.path.length >= 2) {
    const startPt = route.path[0];
    const endPt = route.path[route.path.length - 1];
    const isClosedLoop =
      !hasSeparateReturn && getDistanceMeters(startPt, endPt) <= 500;

    const idaMatch = findBestOrderedPairOnPath(
      origin,
      destination,
      route.path,
      isClosedLoop
    );

    if (idaMatch) {
      candidates.push({
        directionMode: hasSeparateReturn ? 'ida' : 'both',
        directionLabel: hasSeparateReturn
          ? 'Sentido Ida'
          : isClosedLoop
          ? 'Circuito continuo'
          : 'Trazado directo',
        originProj: idaMatch.originProj,
        destProj: idaMatch.destProj,
        rideMeters: idaMatch.rideMeters,
        walkSum: idaMatch.originProj.distanceMeters + idaMatch.destProj.distanceMeters,
      });
    }
  }

  if (hasSeparateReturn) {
    const vueltaMatch = findBestOrderedPairOnPath(
      origin,
      destination,
      route.returnPath,
      false
    );
    if (vueltaMatch) {
      candidates.push({
        directionMode: 'regreso',
        directionLabel: 'Sentido Vuelta',
        originProj: vueltaMatch.originProj,
        destProj: vueltaMatch.destProj,
        rideMeters: vueltaMatch.rideMeters,
        walkSum:
          vueltaMatch.originProj.distanceMeters + vueltaMatch.destProj.distanceMeters,
      });
    }
  }

  if (hasMultiSegments && route.segments) {
    // Check ordered pairs inside individual segments first
    for (const seg of route.segments) {
      if (seg.length < 2) continue;
      const segMatch = findBestOrderedPairOnPath(origin, destination, seg, false);
      if (segMatch) {
        candidates.push({
          directionMode: 'both',
          directionLabel: 'Trazado directo',
          originProj: segMatch.originProj,
          destProj: segMatch.destProj,
          rideMeters: segMatch.rideMeters,
          walkSum:
            segMatch.originProj.distanceMeters + segMatch.destProj.distanceMeters,
        });
      }
    }

    // Also allow boarding on one segment and alighting on another segment of the same route
    const origSegProj = findClosestPointOnSegments(origin, route.segments);
    const destSegProj = findClosestPointOnSegments(destination, route.segments);
    if (origSegProj && destSegProj) {
      const approxRide = getDistanceMeters(origSegProj.point, destSegProj.point);
      candidates.push({
        directionMode: 'both',
        directionLabel: 'Recorrido completo',
        originProj: origSegProj,
        destProj: destSegProj,
        rideMeters: approxRide,
        walkSum: origSegProj.distanceMeters + destSegProj.distanceMeters,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (Math.abs(a.walkSum - b.walkSum) > 25) return a.walkSum - b.walkSum;
    return a.rideMeters - b.rideMeters;
  });

  const best = candidates[0];
  const originWalkMeters = Math.round(best.originProj.distanceMeters);
  const destWalkMeters = Math.round(best.destProj.distanceMeters);
  const totalWalkMeters = originWalkMeters + destWalkMeters;
  const rideMeters = Math.round(best.rideMeters);

  // Average Barranquilla urban bus speed ~20 km/h (333 m/min) + 2 min stops
  const estimatedRideMinutes = Math.max(
    2,
    Math.round(rideMeters / 330) + 2
  );

  // Rank by walking distance primarily, plus slight preference for shorter bus ride
  const score = totalWalkMeters + rideMeters * 0.08;

  return {
    route,
    directionMode: best.directionMode,
    directionLabel: best.directionLabel,
    originWalkMeters,
    destWalkMeters,
    totalWalkMeters,
    rideMeters,
    estimatedRideMinutes,
    boardingPoint: best.originProj.point,
    alightingPoint: best.destProj.point,
    score,
  };
}

function getAllRoutePoints(route: CompanyRouteItem): LatLng[] {
  const pts: LatLng[] = [];
  if (route.segments && route.segments.length > 0) {
    for (const seg of route.segments) {
      for (let i = 0; i < seg.length; i += 2) pts.push(seg[i]);
      if (seg.length > 0) pts.push(seg[seg.length - 1]);
    }
  } else {
    for (let i = 0; i < route.path.length; i += 2) pts.push(route.path[i]);
    if (route.path.length > 0) pts.push(route.path[route.path.length - 1]);
  }
  if (route.returnPath.length >= 2) {
    for (let i = 0; i < route.returnPath.length; i += 2) pts.push(route.returnPath[i]);
  }
  return pts;
}

function findTransferMatches(
  routes: CompanyRouteItem[],
  origin: LatLng,
  destination: LatLng,
  maxEndpointWalk: number,
  maxTransferWalk: number
): TransferTripMatch[] {
  // Collect candidate first-leg routes close to origin & second-leg routes close to destination
  const originCandidates: Array<{
    route: CompanyRouteItem;
    originWalk: number;
    originIdx: number;
    path: LatLng[];
    dir: RouteDirectionMode;
  }> = [];

  const destCandidates: Array<{
    route: CompanyRouteItem;
    destWalk: number;
    destIdx: number;
    path: LatLng[];
    dir: RouteDirectionMode;
  }> = [];

  for (const route of routes) {
    const pathsToCheck: Array<{path: LatLng[]; dir: RouteDirectionMode}> = [];
    if (route.path.length >= 2) {
      pathsToCheck.push({
        path: route.path,
        dir: route.returnPath.length >= 2 ? 'ida' : 'both',
      });
    }
    if (route.returnPath.length >= 2) {
      pathsToCheck.push({path: route.returnPath, dir: 'regreso'});
    }

    for (const entry of pathsToCheck) {
      let bestOrigDist = Infinity;
      let bestOrigIdx = 0;
      let bestDestDist = Infinity;
      let bestDestIdx = 0;

      for (let i = 0; i < entry.path.length; i++) {
        const dO = getDistanceMeters(origin, entry.path[i]);
        if (dO < bestOrigDist) {
          bestOrigDist = dO;
          bestOrigIdx = i;
        }
        const dD = getDistanceMeters(destination, entry.path[i]);
        if (dD < bestDestDist) {
          bestDestDist = dD;
          bestDestIdx = i;
        }
      }

      if (bestOrigDist <= maxEndpointWalk) {
        originCandidates.push({
          route,
          originWalk: bestOrigDist,
          originIdx: bestOrigIdx,
          path: entry.path,
          dir: entry.dir,
        });
      }
      if (bestDestDist <= maxEndpointWalk) {
        destCandidates.push({
          route,
          destWalk: bestDestDist,
          destIdx: bestDestIdx,
          path: entry.path,
          dir: entry.dir,
        });
      }
    }
  }

  originCandidates.sort((a, b) => a.originWalk - b.originWalk);
  destCandidates.sort((a, b) => a.destWalk - b.destWalk);

  const topOrigins = originCandidates.slice(0, 14);
  const topDests = destCandidates.slice(0, 14);

  const results: TransferTripMatch[] = [];
  const seenPairs = new Set<string>();

  for (const oCand of topOrigins) {
    const isClosed1 =
      oCand.route.returnPath.length < 2 &&
      getDistanceMeters(oCand.path[0], oCand.path[oCand.path.length - 1]) <= 500;
    const pts1 = isClosed1
      ? oCand.path
      : oCand.path.slice(oCand.originIdx);

    for (const dCand of topDests) {
      if (oCand.route.id === dCand.route.id) continue;
      const pairKey = `${oCand.route.id}__${dCand.route.id}`;
      if (seenPairs.has(pairKey)) continue;

      const isClosed2 =
        dCand.route.returnPath.length < 2 &&
        getDistanceMeters(dCand.path[0], dCand.path[dCand.path.length - 1]) <= 500;
      const pts2 = isClosed2
        ? dCand.path
        : dCand.path.slice(0, dCand.destIdx + 1);

      let minTransferDist = Infinity;
      let bestTransferPt: LatLng | null = null;

      const step1 = pts1.length > 40 ? 2 : 1;
      const step2 = pts2.length > 40 ? 2 : 1;

      for (let i = 0; i < pts1.length; i += step1) {
        for (let j = 0; j < pts2.length; j += step2) {
          const d = getDistanceMeters(pts1[i], pts2[j]);
          if (d < minTransferDist) {
            minTransferDist = d;
            bestTransferPt = {
              lat: (pts1[i].lat + pts2[j].lat) / 2,
              lng: (pts1[i].lng + pts2[j].lng) / 2,
            };
          }
        }
      }

      if (bestTransferPt && minTransferDist <= maxTransferWalk) {
        seenPairs.add(pairKey);
        const originWalkMeters = Math.round(oCand.originWalk);
        const transferWalkMeters = Math.round(minTransferDist);
        const destWalkMeters = Math.round(dCand.destWalk);
        const totalWalkMeters =
          originWalkMeters + transferWalkMeters + destWalkMeters;

        results.push({
          id: pairKey,
          firstLeg: oCand.route,
          firstDirection: oCand.dir,
          secondLeg: dCand.route,
          secondDirection: dCand.dir,
          originWalkMeters,
          transferWalkMeters,
          destWalkMeters,
          totalWalkMeters,
          transferPoint: bestTransferPt,
          score: totalWalkMeters + 250,
        });
      }
    }
  }

  // Fallback with sampled points if directional slice was strict
  if (results.length === 0) {
    for (const oCand of topOrigins.slice(0, 8)) {
      const pts1 = getAllRoutePoints(oCand.route);
      for (const dCand of topDests.slice(0, 8)) {
        if (oCand.route.id === dCand.route.id) continue;
        const pairKey = `${oCand.route.id}__${dCand.route.id}`;
        if (seenPairs.has(pairKey)) continue;
        const pts2 = getAllRoutePoints(dCand.route);
        let minTransferDist = Infinity;
        let bestTransferPt: LatLng | null = null;
        for (const p1 of pts1) {
          for (const p2 of pts2) {
            const d = getDistanceMeters(p1, p2);
            if (d < minTransferDist) {
              minTransferDist = d;
              bestTransferPt = p1;
            }
          }
        }
        if (bestTransferPt && minTransferDist <= maxTransferWalk) {
          seenPairs.add(pairKey);
          const originWalkMeters = Math.round(oCand.originWalk);
          const transferWalkMeters = Math.round(minTransferDist);
          const destWalkMeters = Math.round(dCand.destWalk);
          const totalWalkMeters =
            originWalkMeters + transferWalkMeters + destWalkMeters;
          results.push({
            id: pairKey,
            firstLeg: oCand.route,
            firstDirection: oCand.dir,
            secondLeg: dCand.route,
            secondDirection: dCand.dir,
            originWalkMeters,
            transferWalkMeters,
            destWalkMeters,
            totalWalkMeters,
            transferPoint: bestTransferPt,
            score: totalWalkMeters + 350,
          });
        }
      }
    }
  }

  return results.sort((a, b) => a.score - b.score).slice(0, 5);
}

/**
 * Finds all bus routes that take a passenger from `origin` to `destination`.
 * Prioritizes direct routes within comfortable walking distance (<= 750 m at both ends),
 * expands to <= 1200 m if few direct routes match, and provides 1-transfer options if needed.
 */
export function findTripRoutes(
  routes: CompanyRouteItem[],
  origin: LatLng,
  destination: LatLng
): TripMatchResult {
  const tripDirectDist = getDistanceMeters(origin, destination);
  const minMeaningfulRide = tripDirectDist > 300 ? 120 : 0;

  const evaluated: Array<Omit<DirectTripMatch, 'isExtendedWalk'>> = [];
  for (const route of routes) {
    const match = evaluateRouteDirect(route, origin, destination);
    if (!match) continue;
    if (match.rideMeters < minMeaningfulRide && match.totalWalkMeters > 250) continue;
    evaluated.push(match);
  }

  // Tier 1: Comfortable walk (<= 750m from origin and <= 750m to destination)
  const comfortableDirect = evaluated
    .filter((m) => m.originWalkMeters <= 750 && m.destWalkMeters <= 750)
    .sort((a, b) => a.score - b.score)
    .map((m) => ({...m, isExtendedWalk: false}));

  if (comfortableDirect.length >= 3) {
    return {
      direct: comfortableDirect,
      transfers: [],
      hasExtendedWalkOnly: false,
    };
  }

  // Tier 2: Moderate walk (<= 1150m from origin and <= 1150m to destination)
  const moderateDirect = evaluated
    .filter((m) => m.originWalkMeters <= 1150 && m.destWalkMeters <= 1150)
    .sort((a, b) => a.score - b.score)
    .map((m) => ({
      ...m,
      isExtendedWalk: m.originWalkMeters > 750 || m.destWalkMeters > 750,
    }));

  if (moderateDirect.length > 0) {
    const transfers =
      comfortableDirect.length === 0
        ? findTransferMatches(routes, origin, destination, 750, 320)
        : [];
    return {
      direct: moderateDirect,
      transfers,
      hasExtendedWalkOnly: comfortableDirect.length === 0,
    };
  }

  // Tier 3: No direct route <= 1150m -> compute 1-transfer options + extended direct routes <= 2000m
  const transfers = findTransferMatches(routes, origin, destination, 1000, 400);
  const extendedDirect = evaluated
    .filter((m) => m.originWalkMeters <= 2000 && m.destWalkMeters <= 2000)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((m) => ({...m, isExtendedWalk: true}));

  return {
    direct: extendedDirect,
    transfers,
    hasExtendedWalkOnly: true,
  };
}
