/// <reference types="google.maps" />
import React, {useEffect, useRef, useState} from 'react';
import {
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  useApiIsLoaded,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {AlertTriangle, Bus, MapPin, Navigation, Store} from 'lucide-react';
import {
  BARRANQUILLA_FLEET_CENTER,
  BARRANQUILLA_PASSENGER_CENTER,
  CORRIDOR_POLYLINES,
  TRANSIT_STATIONS,
  USER_GPS_POSITION,
} from '../data/barranquillaTransit';
import type {CompanyRouteItem} from '../data/busRoutesCatalog';
import {fetchPlaceDetailsById} from '../hooks/useAutocompleteSuggestions';
import type {
  FleetBus,
  LatLng,
  MapBounds,
  PlacePoint,
  RouteFilter,
  TransitStation,
} from '../types/transit';

const ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
const DEMO_MAP_ID = 'DEMO_MAP_ID';

export interface NearbyBusMarker {
  id: string;
  code: string;
  company: string;
  position: LatLng;
  etaMinutes: number;
  distanceMeters: number;
  color: string;
}

interface CorridorOverlayProps {
  visible: boolean;
  routeFilter: RouteFilter;
  showTraffic?: boolean;
  dimmed?: boolean;
}

function TransitCorridorsOverlay({
  visible,
  routeFilter,
  showTraffic,
  dimmed = false,
}: CorridorOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !visible) return;

    const polylines: google.maps.Polyline[] = [];
    for (const corridor of CORRIDOR_POLYLINES) {
      if (routeFilter === 'troncal' && corridor.id === 'alimentador-a12') continue;
      if (routeFilter === 'alimentador' && corridor.id === 'troncal-cra-46') continue;

      const poly = new mapsLib.Polyline({
        path: corridor.path,
        strokeColor: corridor.color,
        strokeOpacity: dimmed ? 0.22 : Math.min(corridor.opacity, 0.58),
        strokeWeight: dimmed ? 2.5 : 3.5,
        geodesic: true,
        zIndex: 8,
        map,
      });
      polylines.push(poly);
    }

    return () => {
      for (const poly of polylines) {
        poly.setMap(null);
      }
    };
  }, [map, mapsLib, visible, routeFilter, dimmed]);

  useEffect(() => {
    if (!map || !mapsLib || !showTraffic) return;
    const trafficLayer = new mapsLib.TrafficLayer();
    trafficLayer.setMap(map);
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, mapsLib, showTraffic]);

  return null;
}

export type RouteDirectionMode = 'both' | 'ida' | 'regreso';

function SelectedRouteOverlay({
  route,
  directionMode = 'both',
}: {
  route: CompanyRouteItem | null | undefined;
  directionMode?: RouteDirectionMode;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !route) return;

    const overlays: google.maps.Polyline[] = [];
    const idaPaths =
      route.segments && route.segments.length > 0
        ? route.segments.filter((s) => s.length >= 2)
        : route.path.length >= 2
        ? [route.path]
        : [];
    const showIda = directionMode !== 'regreso' && idaPaths.length > 0;
    const showRegreso = directionMode !== 'ida' && route.returnPath.length >= 2;

    if (showRegreso) {
      overlays.push(
        new mapsLib.Polyline({
          path: route.returnPath,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.9,
          strokeWeight: 8,
          geodesic: true,
          zIndex: 37,
          map,
        })
      );
      overlays.push(
        new mapsLib.Polyline({
          path: route.returnPath,
          strokeColor: '#E74C3C',
          strokeOpacity: 0.92,
          strokeWeight: 4.5,
          geodesic: true,
          zIndex: 39,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2.5,
                fillColor: '#FFFFFF',
                fillOpacity: 1,
                strokeColor: '#B91C1C',
                strokeWeight: 1.5,
              },
              offset: '55px',
              repeat: '110px',
            },
          ],
          map,
        })
      );
    }

    if (showIda) {
      for (const segPath of idaPaths) {
        overlays.push(
          new mapsLib.Polyline({
            path: segPath,
            strokeColor: '#FFFFFF',
            strokeOpacity: 0.95,
            strokeWeight: 8.5,
            geodesic: true,
            zIndex: 38,
            map,
          })
        );
        overlays.push(
          new mapsLib.Polyline({
            path: segPath,
            strokeColor: '#2ECC71',
            strokeOpacity: 0.96,
            strokeWeight: 5,
            geodesic: true,
            zIndex: 41,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 2.7,
                  fillColor: '#FFFFFF',
                  fillOpacity: 1,
                  strokeColor: '#15803D',
                  strokeWeight: 1.5,
                },
                offset: '35px',
                repeat: '110px',
              },
            ],
            map,
          })
        );
      }
    }

    return () => {
      for (const poly of overlays) {
        poly.setMap(null);
      }
    };
  }, [map, mapsLib, route, directionMode]);

  return null;
}

function RadiusCircleOverlay({
  center,
  radiusMeters,
}: {
  center: LatLng;
  radiusMeters: number | null | undefined;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !radiusMeters || radiusMeters <= 0) return;

    const circle = new mapsLib.Circle({
      center,
      radius: radiusMeters,
      strokeColor: '#0D9488',
      strokeOpacity: 0.35,
      strokeWeight: 1.5,
      fillColor: '#14B8A6',
      fillOpacity: 0.04,
      clickable: false,
      zIndex: 5,
      map,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, mapsLib, center, radiusMeters]);

  return null;
}

function TripConnectionOverlay({
  origin,
  destination,
}: {
  origin: LatLng;
  destination: LatLng | null | undefined;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !destination) return;

    const line = new mapsLib.Polyline({
      path: [origin, destination],
      strokeColor: '#0D9488',
      strokeOpacity: 0,
      strokeWeight: 3,
      geodesic: true,
      zIndex: 32,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.85,
            strokeColor: '#0D9488',
            scale: 3,
          },
          offset: '0',
          repeat: '12px',
        },
      ],
      map,
    });

    return () => {
      line.setMap(null);
    };
  }, [map, mapsLib, origin, destination]);

  return null;
}

export interface MapControlSignal {
  type: 'zoomIn' | 'zoomOut' | 'reset' | 'centerUser' | 'focus' | 'fitBounds';
  target?: LatLng;
  boundsPoints?: LatLng[];
  zoom?: number;
  nonce: number;
}

function CameraController({
  signal,
  defaultCenter,
  defaultZoom,
  onCameraSync,
}: {
  signal: MapControlSignal | null;
  defaultCenter: LatLng;
  defaultZoom: number;
  onCameraSync?: (zoom: number, isAtDefault: boolean) => void;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !onCameraSync) return;
    const updateSync = () => {
      const z = map.getZoom() ?? defaultZoom;
      const c = map.getCenter();
      const same =
        z === defaultZoom &&
        c != null &&
        Math.abs(c.lat() - defaultCenter.lat) < 1e-4 &&
        Math.abs(c.lng() - defaultCenter.lng) < 1e-4;
      onCameraSync(z, same);
    };
    updateSync();
    const l1 = map.addListener('zoom_changed', updateSync);
    const l2 = map.addListener('idle', updateSync);
    return () => {
      l1.remove();
      l2.remove();
    };
  }, [map, defaultCenter, defaultZoom, onCameraSync]);

  useEffect(() => {
    if (!map || !signal) return;
    const rafId = window.requestAnimationFrame(() => {
      google.maps?.event?.trigger(map, 'resize');
      const currentZoom = map.getZoom() ?? defaultZoom;
      if (signal.type === 'zoomIn') {
        map.setZoom(Math.min(19, currentZoom + 1));
      } else if (signal.type === 'zoomOut') {
        map.setZoom(Math.max(11, currentZoom - 1));
      } else if (signal.type === 'reset') {
        map.panTo(defaultCenter);
        map.setZoom(defaultZoom);
      } else if (signal.type === 'centerUser') {
        map.panTo(signal.target ?? USER_GPS_POSITION);
        map.setZoom(signal.zoom ?? 16);
      } else if (signal.type === 'focus' && signal.target) {
        map.panTo(signal.target);
        if (signal.zoom) map.setZoom(signal.zoom);
      } else if (
        signal.type === 'fitBounds' &&
        signal.boundsPoints &&
        signal.boundsPoints.length > 0
      ) {
        if (signal.boundsPoints.length === 1 || !coreLib) {
          map.panTo(signal.boundsPoints[0]);
          map.setZoom(signal.zoom ?? 15);
        } else {
          const bounds = new coreLib.LatLngBounds();
          for (const pt of signal.boundsPoints) {
            bounds.extend(pt);
          }
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          if (Math.abs(ne.lat() - sw.lat()) < 0.0025 && Math.abs(ne.lng() - sw.lng()) < 0.0025) {
            map.panTo(bounds.getCenter());
            map.setZoom(signal.zoom ?? 16);
          } else {
            const div = map.getDiv();
            const h = div?.clientHeight || 520;
            const w = div?.clientWidth || 380;
            map.fitBounds(bounds, {
              top: Math.min(110, Math.floor(h * 0.22)),
              right: Math.min(40, Math.floor(w * 0.1)),
              bottom: Math.min(72, Math.floor(h * 0.15)),
              left: Math.min(32, Math.floor(w * 0.08)),
            });
          }
        }
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [map, coreLib, signal, defaultCenter, defaultZoom]);

  return null;
}

function MapStatusOverlay({theme = 'light'}: {theme?: 'light' | 'dark'}) {
  const isLoaded = useApiIsLoaded();
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center ${
          theme === 'dark' ? 'bg-slate-900/95 text-slate-200' : 'bg-slate-100/95 text-slate-800'
        }`}
      >
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="font-headline text-sm font-bold">Mapa de Barranquilla no disponible</p>
        <p className="text-xs opacity-80 max-w-xs mt-1">
          No se pudo cargar Google Maps Platform. Verifica la clave o la conexión de red.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center ${
          theme === 'dark' ? 'bg-slate-900/80 text-slate-300' : 'bg-slate-200/80 text-slate-700'
        }`}
      >
        <span className="text-xs font-mono font-medium">Cargando mapa de Barranquilla...</span>
      </div>
    );
  }

  return null;
}

interface BarranquillaPassengerMapProps {
  routeFilter: RouteFilter;
  showTrafficLayer: boolean;
  showCorridors: boolean;
  busT01Position: LatLng;
  busA12Position: LatLng;
  userPosition: LatLng;
  originMarker?: {
    name: string;
    address: string;
    position: LatLng;
  } | null;
  selectedDestination?: {
    name: string;
    address: string;
    position: LatLng;
  } | null;
  selectedCompanyRoute?: CompanyRouteItem | null;
  routeDirectionMode?: RouteDirectionMode;
  catalogRoutes?: CompanyRouteItem[];
  userRadiusMeters?: number | null;
  nearbyBuses?: NearbyBusMarker[];
  signal: MapControlSignal | null;
  mapPickMode?: 'origin' | 'destination' | null;
  draftPickPosition?: LatLng | null;
  onPickMapCoordinate?: (pos: LatLng) => void;
  onCameraSync?: (zoom: number, isAtDefault: boolean) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  onSelectCatalogRoute?: (route: CompanyRouteItem) => void;
  onSelectStation: (station: TransitStation) => void;
  onSelectBus: (routeCode: string) => void;
  onSelectNearbyBus?: (bus: NearbyBusMarker) => void;
  onSelectMapPoi?: (place: PlacePoint) => void;
}

export function BarranquillaPassengerMap({
  routeFilter,
  showTrafficLayer,
  showCorridors,
  busT01Position,
  busA12Position,
  userPosition,
  originMarker,
  selectedDestination,
  selectedCompanyRoute,
  routeDirectionMode = 'both',
  catalogRoutes = [],
  userRadiusMeters,
  nearbyBuses = [],
  signal,
  mapPickMode = null,
  draftPickPosition = null,
  onPickMapCoordinate,
  onCameraSync,
  onBoundsChanged,
  onSelectCatalogRoute,
  onSelectStation,
  onSelectBus,
  onSelectNearbyBus,
  onSelectMapPoi,
}: BarranquillaPassengerMapProps) {
  const isDraggingRef = useRef(false);
  const placesLib = useMapsLibrary('places');

  const showT01 = routeFilter === 'all' || routeFilter === 'troncal';
  const showA12 = routeFilter === 'all' || routeFilter === 'alimentador';
  const activeOrigin = originMarker?.position ?? userPosition;
  const visibleNearbyMarkers = React.useMemo(() => {
    const top = nearbyBuses.slice(0, 5);
    if (!selectedCompanyRoute) return top;
    const selectedBus = nearbyBuses.find((b) => b.id === `bus-${selectedCompanyRoute.id}`);
    if (!selectedBus || top.some((b) => b.id === selectedBus.id)) return top;
    return [selectedBus, ...top.slice(0, 4)];
  }, [nearbyBuses, selectedCompanyRoute]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <MapStatusOverlay theme="light" />
      <GoogleMap
        id="baq-passenger-map"
        mapId={DEMO_MAP_ID}
        colorScheme="LIGHT"
        defaultCenter={BARRANQUILLA_PASSENGER_CENTER}
        defaultZoom={15}
        minZoom={11}
        maxZoom={19}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={!mapPickMode}
        internalUsageAttributionIds={ATTRIBUTION_IDS}
        onDragstart={() => {
          isDraggingRef.current = true;
        }}
        onIdle={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 80);
        }}
        onClick={(e) => {
          if (mapPickMode && e.detail.latLng) {
            e.stop();
            onPickMapCoordinate?.({
              lat: e.detail.latLng.lat,
              lng: e.detail.latLng.lng,
            });
            return;
          }
          const placeId = e.detail.placeId;
          if (!placeId || !placesLib || !onSelectMapPoi) return;
          e.stop();
          void fetchPlaceDetailsById(placesLib, placeId).then((place) => {
            if (place) onSelectMapPoi(place);
          });
        }}
        style={{width: '100%', height: '100%'}}
      >
        <CameraController
          signal={signal}
          defaultCenter={BARRANQUILLA_PASSENGER_CENTER}
          defaultZoom={15}
          onCameraSync={onCameraSync}
        />
        <RoutesBoundsWatcher onBoundsChanged={onBoundsChanged} />
        <TransitCorridorsOverlay
          visible={showCorridors && catalogRoutes.length === 0 && !selectedCompanyRoute}
          routeFilter={routeFilter}
          showTraffic={showTrafficLayer}
        />
        <RoutesCatalogPolylines
          routes={catalogRoutes}
          selectedRouteId={selectedCompanyRoute?.id ?? null}
          onSelectRoute={(route) => onSelectCatalogRoute?.(route)}
        />
        <RadiusCircleOverlay center={activeOrigin} radiusMeters={userRadiusMeters} />
        <TripConnectionOverlay origin={activeOrigin} destination={selectedDestination?.position} />
        <SelectedRouteOverlay
          route={selectedCompanyRoute}
          directionMode={routeDirectionMode}
        />

        {/* Clean Station Dots (Primary labeled, secondary compact dots) */}
        {TRANSIT_STATIONS.map((station) => (
          <AdvancedMarker
            key={station.id}
            position={station.position}
            zIndex={10}
            onClick={() => {
              if (!isDraggingRef.current) onSelectStation(station);
            }}
            title={station.name}
          >
            <button
              type="button"
              className="flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              {station.isPrimary ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md border-2 border-white group-hover:scale-110 transition-transform">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <span className="mt-0.5 px-1.5 py-0.5 rounded bg-white/95 text-slate-900 border border-slate-200 text-[10px] font-semibold shadow-sm whitespace-nowrap">
                    Est. La Catorce
                  </span>
                </>
              ) : (
                <div className="w-4 h-4 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow border-2 border-[#2563EB] group-hover:scale-125 transition-transform">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                </div>
              )}
            </button>
          </AdvancedMarker>
        ))}

        {/* Live Bus T-01 (Compact crisp marker) */}
        {showT01 && (
          <AdvancedMarker
            position={busT01Position}
            zIndex={60}
            onClick={() => {
              if (!isDraggingRef.current) onSelectBus('T-01');
            }}
            title="Bus #B-304 · Troncal T-01 (2 min)"
          >
            <button
              type="button"
              className="px-2 py-1 rounded-full bg-[#2563EB] text-white shadow-lg border-2 border-white flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform focus:outline-none"
            >
              <Bus className="w-3.5 h-3.5" />
              <span className="font-headline text-[10px] font-bold">T-01</span>
              <span className="font-mono text-[10px] text-blue-100">2m</span>
            </button>
          </AdvancedMarker>
        )}

        {/* Live Bus A-12 (Compact crisp marker) */}
        {showA12 && (
          <AdvancedMarker
            position={busA12Position}
            zIndex={50}
            onClick={() => {
              if (!isDraggingRef.current) onSelectBus('A-12');
            }}
            title="Bus #B-118 · Alimentador A-12 (6 min)"
          >
            <button
              type="button"
              className="px-2 py-1 rounded-full bg-[#16A34A] text-white shadow-md border-2 border-white flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform focus:outline-none"
            >
              <Bus className="w-3 h-3" />
              <span className="font-headline text-[10px] font-bold">A-12</span>
              <span className="font-mono text-[10px] text-emerald-100">6m</span>
            </button>
          </AdvancedMarker>
        )}

        {/* Compact Nearby Company Buses (Top 5 closest to avoid map clutter) */}
        {visibleNearbyMarkers.map((bus) => (
          <AdvancedMarker
            key={bus.id}
            position={bus.position}
            zIndex={55}
            onClick={() => {
              if (!isDraggingRef.current) onSelectNearbyBus?.(bus);
            }}
            title={`${bus.company} · Ruta ${bus.code} (${bus.etaMinutes} min)`}
          >
            <button
              type="button"
              className="px-1.5 py-0.5 rounded-full bg-white/95 hover:bg-slate-900 hover:text-white text-slate-900 shadow-md border border-slate-300 flex items-center gap-1 cursor-pointer hover:scale-105 transition-all focus:outline-none"
            >
              <Bus className="w-3 h-3 text-[#0D9488]" />
              <span className="font-headline text-[10px] font-bold whitespace-nowrap">
                {bus.code}
              </span>
              <span className="font-mono text-[9px] text-emerald-700 font-bold">
                {bus.etaMinutes}m
              </span>
            </button>
          </AdvancedMarker>
        ))}

        {/* Selected Bus Company Route Endpoints & Badge (rutaquilla.me style) */}
        {selectedCompanyRoute && (
          <>
            <AdvancedMarker
              position={selectedCompanyRoute.startPoint.position}
              zIndex={76}
              title={`Inicio: ${selectedCompanyRoute.startPoint.name}`}
            >
              <div className="flex flex-col items-center">
                <span className="px-2 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold shadow-md border border-white whitespace-nowrap max-w-[140px] truncate">
                  Inicio · {selectedCompanyRoute.startPoint.name}
                </span>
              </div>
            </AdvancedMarker>
            <AdvancedMarker
              position={selectedCompanyRoute.endPoint.position}
              zIndex={76}
              title={`Retorno: ${selectedCompanyRoute.endPoint.name}`}
            >
              <div className="flex flex-col items-center">
                <span className="px-2 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold shadow-md border border-white whitespace-nowrap max-w-[140px] truncate">
                  Retorno · {selectedCompanyRoute.endPoint.name}
                </span>
              </div>
            </AdvancedMarker>
            <AdvancedMarker
              position={selectedCompanyRoute.center}
              zIndex={75}
              title={`${selectedCompanyRoute.company} · ${selectedCompanyRoute.name}`}
            >
              <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-xl border-2 border-white flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="font-headline text-xs font-bold whitespace-nowrap">
                  {selectedCompanyRoute.code}
                </span>
                <span className="text-[10px] text-teal-300 font-medium whitespace-nowrap">
                  · {selectedCompanyRoute.company}
                </span>
              </div>
            </AdvancedMarker>
          </>
        )}

        {/* Custom Origin Marker (Punto de partida) */}
        {originMarker && (
          <AdvancedMarker
            position={originMarker.position}
            zIndex={78}
            title={`Partida: ${originMarker.name}`}
          >
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <span className="mt-0.5 px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold shadow border border-white max-w-[140px] truncate">
                A · {originMarker.name}
              </span>
            </div>
          </AdvancedMarker>
        )}

        {/* Selected Search Destination Pin */}
        {selectedDestination && (
          <AdvancedMarker
            position={selectedDestination.position}
            zIndex={82}
            title={`Destino: ${selectedDestination.name}`}
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-400 flex items-center justify-center shadow-xl border-2 border-white">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="mt-0.5 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-semibold shadow-lg border border-slate-700 max-w-[155px] truncate">
                B · {selectedDestination.name}
              </span>
            </div>
          </AdvancedMarker>
        )}

        {/* Interactive Map Pin Picker (draggable) */}
        {mapPickMode && draftPickPosition && (
          <AdvancedMarker
            position={draftPickPosition}
            zIndex={95}
            draggable={true}
            onDragEnd={(e) => {
              if (e.latLng) {
                onPickMapCoordinate?.({
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                });
              }
            }}
            title={
              mapPickMode === 'origin'
                ? 'Arrastra para fijar tu punto de recogida'
                : 'Arrastra para fijar tu destino'
            }
          >
            <div className="flex flex-col items-center cursor-grab active:cursor-grabbing">
              <span
                className={`mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg border border-white whitespace-nowrap ${
                  mapPickMode === 'origin' ? 'bg-emerald-600' : 'bg-[#0D9488]'
                }`}
              >
                {mapPickMode === 'origin' ? 'A · Recogida (Arrastra)' : 'B · Destino (Arrastra)'}
              </span>
              <div className="relative flex items-center justify-center">
                <span
                  className={`w-11 h-11 rounded-full animate-ping absolute opacity-35 ${
                    mapPickMode === 'origin' ? 'bg-emerald-500' : 'bg-[#0D9488]'
                  }`}
                />
                <div
                  className={`w-9 h-9 rounded-full text-white flex items-center justify-center shadow-2xl border-[3px] border-white ${
                    mapPickMode === 'origin' ? 'bg-emerald-600' : 'bg-slate-900'
                  }`}
                >
                  {mapPickMode === 'origin' ? (
                    <Navigation className="w-4 h-4" />
                  ) : (
                    <MapPin className="w-4 h-4 text-teal-400" />
                  )}
                </div>
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* User Current Location (Clean blue-teal beacon) */}
        <AdvancedMarker position={userPosition} zIndex={70} title="Tu ubicación GPS">
          <div className="relative flex items-center justify-center pointer-events-none">
            <span className="w-7 h-7 rounded-full bg-[#0D9488]/25 animate-ping absolute" />
            <div className="w-4 h-4 rounded-full bg-[#0D9488] border-2 border-white shadow-md" />
          </div>
        </AdvancedMarker>
      </GoogleMap>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Routes Catalog Interactive Map (Screen: Rutas)                    */
/* ------------------------------------------------------------------ */

function RoutesBoundsWatcher({
  onBoundsChanged,
}: {
  onBoundsChanged?: (bounds: MapBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onBoundsChanged) return;

    const emit = () => {
      const b = map.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      onBoundsChanged({
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });
    };

    const listener = map.addListener('idle', emit);
    const t = window.setTimeout(emit, 250);
    return () => {
      window.clearTimeout(t);
      listener.remove();
    };
  }, [map, onBoundsChanged]);

  return null;
}

function RoutesCatalogPolylines({
  routes,
  selectedRouteId,
  onSelectRoute,
}: {
  routes: CompanyRouteItem[];
  selectedRouteId?: string | null;
  onSelectRoute: (route: CompanyRouteItem) => void;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return;

    const polylines: google.maps.Polyline[] = [];
    const useCasing = !selectedRouteId && routes.length <= 40;
    const isDenseOverview = !selectedRouteId && routes.length > 40;

    for (const route of routes) {
      if (route.id === selectedRouteId) continue;
      const paths =
        route.segments && route.segments.length > 0
          ? route.segments.filter((s) => s.length >= 2)
          : route.path.length >= 2
          ? [route.path]
          : [];
      if (paths.length === 0) continue;

      for (const segPath of paths) {
        if (useCasing) {
          const casing = new mapsLib.Polyline({
            path: segPath,
            strokeColor: '#FFFFFF',
            strokeOpacity: 0.65,
            strokeWeight: 5,
            geodesic: true,
            clickable: false,
            zIndex: 11,
            map,
          });
          polylines.push(casing);
        }

        const poly = new mapsLib.Polyline({
          path: segPath,
          strokeColor: route.color,
          strokeOpacity: selectedRouteId ? 0.14 : isDenseOverview ? 0.72 : 0.85,
          strokeWeight: selectedRouteId ? 2 : isDenseOverview ? 2.6 : 3.2,
          geodesic: true,
          clickable: true,
          zIndex: 13,
          map,
        });
        poly.addListener('click', () => onSelectRoute(route));
        polylines.push(poly);
      }
    }

    return () => {
      for (const poly of polylines) {
        poly.setMap(null);
      }
    };
  }, [map, mapsLib, routes, selectedRouteId, onSelectRoute]);

  return null;
}



/* ------------------------------------------------------------------ */
/*  Fleet Map (Screen: Operador)                                      */
/* ------------------------------------------------------------------ */

interface BarranquillaFleetMapProps {
  buses: FleetBus[];
  routeCategoryFilter: 'all' | 'troncal' | 'alimentador' | 'expreso';
  onInspectBus: (bus: FleetBus) => void;
}

export function BarranquillaFleetMap({
  buses,
  routeCategoryFilter,
  onInspectBus,
}: BarranquillaFleetMapProps) {
  const [fleetSignal, setFleetSignal] = useState<MapControlSignal | null>(null);

  const visibleBuses = buses.filter((b) =>
    routeCategoryFilter === 'all' ? true : b.category === routeCategoryFilter
  );

  return (
    <div className="relative w-full h-full">
      <MapStatusOverlay theme="dark" />
      <GoogleMap
        id="baq-fleet-map"
        mapId={DEMO_MAP_ID}
        colorScheme="DARK"
        defaultCenter={BARRANQUILLA_FLEET_CENTER}
        defaultZoom={14}
        minZoom={11}
        maxZoom={18}
        gestureHandling="greedy"
        disableDefaultUI={true}
        internalUsageAttributionIds={ATTRIBUTION_IDS}
        style={{width: '100%', height: '100%'}}
      >
        <CameraController
          signal={fleetSignal}
          defaultCenter={BARRANQUILLA_FLEET_CENTER}
          defaultZoom={14}
        />
        <TransitCorridorsOverlay visible={true} routeFilter="all" showTraffic={false} />

        {visibleBuses.map((bus) => {
          const pct = Math.round((bus.paxCurrent / bus.paxMax) * 100);
          const colorBg =
            bus.category === 'troncal'
              ? 'bg-[#2563EB]'
              : bus.category === 'alimentador'
              ? 'bg-[#16A34A]'
              : 'bg-[#DC2626]';
          const tagColor =
            bus.category === 'troncal'
              ? 'text-teal-300 border-slate-700'
              : bus.category === 'alimentador'
              ? 'text-emerald-400 border-slate-700'
              : 'text-rose-400 border-rose-800';

          return (
            <AdvancedMarker
              key={bus.id}
              position={bus.position}
              zIndex={bus.hasDelay ? 60 : 40}
              onClick={() => onInspectBus(bus)}
              title={`#${bus.id} · ${bus.routeLabel}`}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-7 h-7 rounded-full ${colorBg} text-white flex items-center justify-center shadow-lg border-2 border-white ${
                    bus.hasDelay ? 'animate-pulse' : ''
                  } group-hover:scale-110 transition-transform`}
                >
                  {bus.hasDelay ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Bus className="w-3.5 h-3.5" />
                  )}
                </div>
                <div
                  className={`px-2 py-0.5 rounded bg-slate-950/95 text-white border font-mono text-[11px] shadow whitespace-nowrap ${tagColor}`}
                >
                  <span className="font-bold">#{bus.id}</span> • {bus.routeCode} (
                  {bus.hasDelay ? bus.etaLabel : `${pct}%`})
                </div>
              </button>
            </AdvancedMarker>
          );
        })}
      </GoogleMap>

      {/* Quick recenter button inside fleet viewport */}
      <button
        type="button"
        onClick={() => setFleetSignal({type: 'reset', nonce: Date.now()})}
        className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded bg-slate-950/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px] shadow transition-colors"
      >
        Centrar BAQ
      </button>
    </div>
  );
}
