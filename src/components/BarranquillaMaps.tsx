/// <reference types="google.maps" />
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  RenderingType,
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
import type {RouteFleetBusMarker} from '../utils/routeFleetSimulator';
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

const MINIMAL_MONOCHROME_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    elementType: 'all',
    stylers: [{saturation: -100}],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{color: '#e6e6e6'}],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{color: '#dcdcdc'}],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{color: '#c4c4c4'}],
  },
  {
    featureType: 'water',
    elementType: 'labels',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{visibility: 'on'}, {color: '#d4d4d4'}],
  },
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'administrative',
    elementType: 'labels.icon',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'all',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{color: '#525252'}],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{color: '#ffffff'}],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{visibility: 'off'}],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text',
    stylers: [{visibility: 'on'}],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{color: '#404040'}],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.stroke',
    stylers: [{color: '#ffffff'}],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.fill',
    stylers: [{color: '#ffffff'}],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{color: '#c8c8c8'}],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text',
    stylers: [{visibility: 'on'}],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{color: '#ffffff'}],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{color: '#999999'}],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{color: '#262626'}],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.stroke',
    stylers: [{color: '#ffffff'}],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text',
    stylers: [{visibility: 'on'}],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{color: '#f7f7f7'}],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{color: '#666666'}],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{color: '#171717'}],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{color: '#ffffff'}],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry.fill',
    stylers: [{color: '#f0f0f0'}],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry.stroke',
    stylers: [{color: '#525252'}],
  },
];

interface MapItemMarkerProps {
  useOverlay: boolean;
  position: LatLng;
  zIndex?: number;
  title?: string;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (pos: LatLng) => void;
  children: React.ReactNode;
}

function HtmlOverlayMarker({
  position,
  zIndex = 10,
  title,
  draggable = false,
  onClick,
  onDragEnd,
  children,
}: Omit<MapItemMarkerProps, 'useOverlay'>) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const positionRef = useRef(position);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const onClickRef = useRef(onClick);
  const onDragEndRef = useRef(onDragEnd);

  onClickRef.current = onClick;
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    positionRef.current = position;
    overlayRef.current?.draw();
  }, [position]);

  useEffect(() => {
    if (containerEl) {
      containerEl.style.zIndex = String(zIndex);
    }
  }, [containerEl, zIndex]);

  useEffect(() => {
    if (!map || !mapsLib || typeof google === 'undefined' || !google.maps?.OverlayView) {
      return;
    }

    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.width = 'max-content';
    el.style.whiteSpace = 'nowrap';
    el.style.visibility = 'hidden';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.zIndex = String(zIndex);
    el.style.pointerEvents = onClickRef.current || draggable ? 'auto' : 'none';
    if (title) el.title = title;

    class ReactHtmlOverlay extends google.maps.OverlayView {
      onAdd() {
        if (draggable) {
          google.maps.OverlayView.preventMapHitsAndGesturesFrom(el);
        } else if (onClickRef.current) {
          google.maps.OverlayView.preventMapHitsFrom(el);
        }
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(el);
        setContainerEl(el);
      }

      draw() {
        const proj = this.getProjection();
        if (!proj) return;
        const pt = proj.fromLatLngToDivPixel(
          new google.maps.LatLng(positionRef.current.lat, positionRef.current.lng)
        );
        if (pt) {
          el.style.left = `${pt.x}px`;
          el.style.top = `${pt.y}px`;
          el.style.visibility = 'visible';
        }
      }

      onRemove() {
        setContainerEl(null);
        el.remove();
      }
    }

    const overlay = new ReactHtmlOverlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    const handleClick = (ev: MouseEvent) => {
      ev.stopPropagation();
      onClickRef.current?.();
    };
    el.addEventListener('click', handleClick);

    let dragStartClient: {x: number; y: number} | null = null;
    let dragStartPixel: {x: number; y: number} | null = null;

    const handlePointerDown = (ev: PointerEvent) => {
      if (!draggable) return;
      ev.stopPropagation();
      el.setPointerCapture(ev.pointerId);
      dragStartClient = {x: ev.clientX, y: ev.clientY};
      dragStartPixel = {
        x: parseFloat(el.style.left || '0'),
        y: parseFloat(el.style.top || '0'),
      };
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!draggable || !dragStartClient || !dragStartPixel) return;
      const dx = ev.clientX - dragStartClient.x;
      const dy = ev.clientY - dragStartClient.y;
      el.style.left = `${dragStartPixel.x + dx}px`;
      el.style.top = `${dragStartPixel.y + dy}px`;
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (!draggable || !dragStartClient || !dragStartPixel) return;
      const dx = ev.clientX - dragStartClient.x;
      const dy = ev.clientY - dragStartClient.y;
      const finalPx = new google.maps.Point(dragStartPixel.x + dx, dragStartPixel.y + dy);
      dragStartClient = null;
      dragStartPixel = null;
      const proj = overlay.getProjection();
      const latLng = proj?.fromDivPixelToLatLng(finalPx);
      if (latLng) {
        onDragEndRef.current?.({lat: latLng.lat(), lng: latLng.lng()});
      }
    };

    if (draggable) {
      el.addEventListener('pointerdown', handlePointerDown);
      el.addEventListener('pointermove', handlePointerMove);
      el.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      el.removeEventListener('click', handleClick);
      if (draggable) {
        el.removeEventListener('pointerdown', handlePointerDown);
        el.removeEventListener('pointermove', handlePointerMove);
        el.removeEventListener('pointerup', handlePointerUp);
      }
      overlay.setMap(null);
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapsLib, title, draggable]);

  if (!containerEl) return null;
  return createPortal(children, containerEl);
}

function MapItemMarker({
  useOverlay,
  position,
  zIndex,
  title,
  draggable,
  onClick,
  onDragEnd,
  children,
}: MapItemMarkerProps) {
  if (useOverlay) {
    return (
      <HtmlOverlayMarker
        position={position}
        zIndex={zIndex}
        title={title}
        draggable={draggable}
        onClick={onClick}
        onDragEnd={onDragEnd}
      >
        {children}
      </HtmlOverlayMarker>
    );
  }

  return (
    <AdvancedMarker
      position={position}
      zIndex={zIndex}
      title={title}
      draggable={draggable}
      onClick={onClick}
      onDragEnd={(e) => {
        if (e.latLng) {
          onDragEnd?.({lat: e.latLng.lat(), lng: e.latLng.lng()});
        }
      }}
    >
      {children}
    </AdvancedMarker>
  );
}

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
  onCameraSnapshot,
}: {
  signal: MapControlSignal | null;
  defaultCenter: LatLng;
  defaultZoom: number;
  onCameraSync?: (zoom: number, isAtDefault: boolean) => void;
  onCameraSnapshot?: (center: LatLng, zoom: number) => void;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || (!onCameraSync && !onCameraSnapshot)) return;
    const updateSync = () => {
      const z = map.getZoom() ?? defaultZoom;
      const c = map.getCenter();
      if (c && onCameraSnapshot) {
        onCameraSnapshot({lat: c.lat(), lng: c.lng()}, z);
      }
      if (onCameraSync) {
        const same =
          z === defaultZoom &&
          c != null &&
          Math.abs(c.lat() - defaultCenter.lat) < 1e-4 &&
          Math.abs(c.lng() - defaultCenter.lng) < 1e-4;
        onCameraSync(z, same);
      }
    };
    updateSync();
    const l1 = map.addListener('zoom_changed', updateSync);
    const l2 = map.addListener('idle', updateSync);
    return () => {
      l1.remove();
      l2.remove();
    };
  }, [map, defaultCenter, defaultZoom, onCameraSync, onCameraSnapshot]);

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
  minimalMap?: boolean;
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
  showNearbyBuses?: boolean;
  nearbyBuses?: NearbyBusMarker[];
  routeBuses?: RouteFleetBusMarker[];
  selectedBusKey?: string | null;
  signal: MapControlSignal | null;
  mapPickMode?: 'origin' | 'destination' | null;
  draftPickPosition?: LatLng | null;
  onPickMapCoordinate?: (pos: LatLng) => void;
  onCameraSync?: (zoom: number, isAtDefault: boolean) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  onSelectCatalogRoute?: (route: CompanyRouteItem) => void;
  onSelectStation: (station: TransitStation) => void;
  onSelectBus: (routeCode: 'T-01' | 'A-12') => void;
  onSelectNearbyBus?: (bus: NearbyBusMarker) => void;
  onSelectRouteBus?: (bus: RouteFleetBusMarker) => void;
  onSelectMapPoi?: (place: PlacePoint) => void;
}

export function BarranquillaPassengerMap({
  routeFilter,
  showTrafficLayer,
  showCorridors,
  minimalMap = true,
  busT01Position,
  busA12Position,
  userPosition,
  originMarker,
  selectedDestination,
  selectedCompanyRoute,
  routeDirectionMode = 'both',
  catalogRoutes = [],
  userRadiusMeters,
  showNearbyBuses = false,
  nearbyBuses = [],
  routeBuses = [],
  selectedBusKey = null,
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
  onSelectRouteBus,
  onSelectMapPoi,
}: BarranquillaPassengerMapProps) {
  const isDraggingRef = useRef(false);
  const lastCameraRef = useRef<{center: LatLng; zoom: number}>({
    center: BARRANQUILLA_PASSENGER_CENTER,
    zoom: 15,
  });
  const placesLib = useMapsLibrary('places');

  const showT01 = showNearbyBuses && (routeFilter === 'all' || routeFilter === 'troncal');
  const showA12 = showNearbyBuses && (routeFilter === 'all' || routeFilter === 'alimentador');
  const activeOrigin = originMarker?.position ?? userPosition;
  const visibleNearbyMarkers = React.useMemo(() => {
    if (!showNearbyBuses) return [];
    const top = nearbyBuses.slice(0, 5);
    if (!selectedCompanyRoute) return top;
    const selectedBus = nearbyBuses.find((b) => b.id === `bus-${selectedCompanyRoute.id}`);
    if (!selectedBus || top.some((b) => b.id === selectedBus.id)) return top;
    return [selectedBus, ...top.slice(0, 4)];
  }, [showNearbyBuses, nearbyBuses, selectedCompanyRoute]);

  return (
    <div className={`absolute inset-0 w-full h-full ${minimalMap ? 'baq-minimal-map' : ''}`}>
      <MapStatusOverlay theme="light" />
      <GoogleMap
        key={minimalMap ? 'minimal' : 'original'}
        mapId={minimalMap ? undefined : DEMO_MAP_ID}
        renderingType={minimalMap ? RenderingType.RASTER : undefined}
        mapTypeId="roadmap"
        backgroundColor={minimalMap ? '#E6E6E6' : '#E8ECEF'}
        colorScheme={minimalMap ? undefined : 'LIGHT'}
        styles={minimalMap ? MINIMAL_MONOCHROME_MAP_STYLES : undefined}
        defaultCenter={lastCameraRef.current.center}
        defaultZoom={lastCameraRef.current.zoom}
        minZoom={11}
        maxZoom={19}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={!minimalMap && !mapPickMode}
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
          if (minimalMap) return;
          const placeId = e.detail.placeId;
          if (!placeId || !onSelectMapPoi) return;
          e.stop();
          void fetchPlaceDetailsById(placesLib ?? null, placeId).then((place) => {
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
          onCameraSnapshot={(center, zoom) => {
            lastCameraRef.current = {center, zoom};
          }}
        />
        <RoutesBoundsWatcher onBoundsChanged={onBoundsChanged} />
        <TransitCorridorsOverlay
          visible={!minimalMap && showCorridors && catalogRoutes.length === 0 && !selectedCompanyRoute}
          routeFilter={routeFilter}
          showTraffic={!minimalMap && showTrafficLayer}
        />
        <RoutesCatalogPolylines
          routes={catalogRoutes}
          selectedRouteId={selectedCompanyRoute?.id ?? null}
          minimalMap={minimalMap}
          onSelectRoute={(route) => onSelectCatalogRoute?.(route)}
        />
        <RadiusCircleOverlay
          center={activeOrigin}
          radiusMeters={!minimalMap && showNearbyBuses ? userRadiusMeters : null}
        />
        <TripConnectionOverlay origin={activeOrigin} destination={selectedDestination?.position} />
        <SelectedRouteOverlay
          route={selectedCompanyRoute}
          directionMode={routeDirectionMode}
        />

        {/* Clean Station Dots (hidden in minimal map mode to reduce signals & colors) */}
        {!minimalMap &&
          TRANSIT_STATIONS.map((station) => (
            <MapItemMarker
              key={station.id}
              useOverlay={minimalMap}
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
            </MapItemMarker>
          ))}

        {/* Live Bus T-01 (Compact crisp marker) */}
        {showT01 && (
          <MapItemMarker
            useOverlay={minimalMap}
            position={busT01Position}
            zIndex={selectedBusKey === 'T-01' ? 92 : 60}
            onClick={() => {
              if (!isDraggingRef.current) onSelectBus('T-01');
            }}
            title="Bus #B-304 · Troncal T-01 (2 min)"
          >
            <button
              type="button"
              data-bus-marker="T-01"
              aria-label="Bus B-304 ruta T-01, llega en 2 minutos"
              className={`px-2 py-1 rounded-full text-white shadow-lg border-2 flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform focus:outline-none ${
                selectedBusKey === 'T-01'
                  ? 'bg-[#0D9488] border-white ring-2 ring-[#0D9488]/40 scale-110'
                  : minimalMap
                  ? 'bg-slate-900 border-white'
                  : 'bg-[#2563EB] border-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span className="font-headline text-[10px] font-bold">T-01</span>
              <span className="font-mono text-[10px] text-slate-200">2m</span>
            </button>
          </MapItemMarker>
        )}

        {/* Live Bus A-12 (Compact crisp marker) */}
        {showA12 && (
          <MapItemMarker
            useOverlay={minimalMap}
            position={busA12Position}
            zIndex={selectedBusKey === 'A-12' ? 92 : 50}
            onClick={() => {
              if (!isDraggingRef.current) onSelectBus('A-12');
            }}
            title="Bus #B-118 · Alimentador A-12 (6 min)"
          >
            <button
              type="button"
              data-bus-marker="A-12"
              aria-label="Bus B-118 ruta A-12, llega en 6 minutos"
              className={`px-2 py-1 rounded-full text-white shadow-md border-2 flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform focus:outline-none ${
                selectedBusKey === 'A-12'
                  ? 'bg-[#0D9488] border-white ring-2 ring-[#0D9488]/40 scale-110'
                  : minimalMap
                  ? 'bg-slate-800 border-white'
                  : 'bg-[#16A34A] border-white'
              }`}
            >
              <Bus className="w-3 h-3" />
              <span className="font-headline text-[10px] font-bold">A-12</span>
              <span className="font-mono text-[10px] text-slate-200">6m</span>
            </button>
          </MapItemMarker>
        )}

        {/* Compact Nearby Company Buses (Top 5 closest to avoid map clutter) */}
        {visibleNearbyMarkers.map((bus) => {
          const isBusSelected = selectedBusKey === bus.id;
          return (
            <MapItemMarker
              key={bus.id}
              useOverlay={minimalMap}
              position={bus.position}
              zIndex={isBusSelected ? 92 : 55}
              onClick={() => {
                if (!isDraggingRef.current) onSelectNearbyBus?.(bus);
              }}
              title={`${bus.company} · Ruta ${bus.code} (${bus.etaMinutes} min)`}
            >
              <button
                type="button"
                data-bus-marker={bus.id}
                aria-label={`Bus ${bus.code} de ${bus.company}, llega en ${bus.etaMinutes} minutos`}
                className={`px-2 py-1 rounded-full shadow-md border flex items-center gap-1 cursor-pointer hover:scale-105 transition-all focus:outline-none ${
                  isBusSelected
                    ? 'bg-[#0D9488] text-white border-white ring-2 ring-[#0D9488]/40 scale-110'
                    : 'bg-white/95 hover:bg-slate-900 hover:text-white text-slate-900 border-slate-300'
                }`}
              >
                <Bus
                  className={`w-3 h-3 ${
                    isBusSelected
                      ? 'text-white'
                      : minimalMap
                      ? 'text-slate-700'
                      : 'text-[#0D9488]'
                  }`}
                />
                <span className="font-headline text-[10px] font-bold whitespace-nowrap">
                  {bus.code}
                </span>
                <span
                  className={`font-mono text-[9px] font-bold ${
                    isBusSelected
                      ? 'text-teal-100'
                      : minimalMap
                      ? 'text-slate-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {bus.etaMinutes}m
                </span>
              </button>
            </MapItemMarker>
          );
        })}

        {/* Live Buses Traveling Along Filtered / Selected Routes (3 to 6 buses per route) */}
        {routeBuses.map((bus) => {
          const isBusSelected = selectedBusKey === bus.id;
          const dirDotColor =
            bus.direction === 'regreso'
              ? 'bg-[#E74C3C]'
              : bus.direction === 'ida'
              ? 'bg-[#2ECC71]'
              : 'bg-[#0D9488]';
          const dirLabel =
            bus.direction === 'regreso'
              ? 'Vuelta'
              : bus.direction === 'ida'
              ? 'Ida'
              : 'Recorrido';

          return (
            <MapItemMarker
              key={bus.id}
              useOverlay={minimalMap}
              position={bus.position}
              zIndex={isBusSelected ? 92 : 65}
              onClick={() => {
                if (!isDraggingRef.current) onSelectRouteBus?.(bus);
              }}
              title={`${bus.company} · Ruta ${bus.code} · Bus #${bus.unitNumber}/${bus.totalUnits} (${dirLabel})`}
            >
              <button
                type="button"
                data-bus-marker={bus.id}
                aria-label={`Bus número ${bus.unitNumber} ruta ${bus.code} de ${bus.company}, ${dirLabel}`}
                className={`px-2 py-1 rounded-full text-white shadow-lg border-[1.5px] border-white flex items-center gap-1 cursor-pointer hover:scale-110 transition-transform focus:outline-none ${
                  isBusSelected
                    ? 'bg-[#0D9488] ring-2 ring-[#0D9488]/40 scale-110'
                    : 'bg-slate-900/95 hover:bg-[#0D9488]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dirDotColor} shrink-0`} />
                <Bus className="w-3 h-3 text-teal-300 shrink-0" />
                <span className="font-headline text-[10px] font-bold whitespace-nowrap">
                  {bus.code}
                </span>
                <span className="font-mono text-[9px] text-slate-300">
                  #{bus.unitNumber}
                </span>
              </button>
            </MapItemMarker>
          );
        })}

        {/* Selected Bus Company Route Endpoints & Badge */}
        {selectedCompanyRoute && (
          <>
            <MapItemMarker
              useOverlay={minimalMap}
              position={selectedCompanyRoute.startPoint.position}
              zIndex={76}
              title={`Inicio: ${selectedCompanyRoute.startPoint.name}`}
            >
              {minimalMap ? (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-md" />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="px-2 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold shadow-md border border-white whitespace-nowrap max-w-[140px] truncate">
                    Inicio · {selectedCompanyRoute.startPoint.name}
                  </span>
                </div>
              )}
            </MapItemMarker>
            <MapItemMarker
              useOverlay={minimalMap}
              position={selectedCompanyRoute.endPoint.position}
              zIndex={76}
              title={`Retorno: ${selectedCompanyRoute.endPoint.name}`}
            >
              {minimalMap ? (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-500 border-2 border-white shadow-md" />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="px-2 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold shadow-md border border-white whitespace-nowrap max-w-[140px] truncate">
                    Retorno · {selectedCompanyRoute.endPoint.name}
                  </span>
                </div>
              )}
            </MapItemMarker>
            {!minimalMap && (
              <MapItemMarker
                useOverlay={minimalMap}
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
              </MapItemMarker>
            )}
          </>
        )}

        {/* Custom Origin Marker (Punto de partida) */}
        {originMarker && (
          <MapItemMarker
            useOverlay={minimalMap}
            position={originMarker.position}
            zIndex={78}
            title={`Partida: ${originMarker.name}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white ${
                  minimalMap ? 'bg-slate-800' : 'bg-emerald-600'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <span
                className={`mt-0.5 px-2 py-0.5 rounded text-white text-[10px] font-bold shadow border border-white max-w-[140px] truncate ${
                  minimalMap ? 'bg-slate-800' : 'bg-emerald-700'
                }`}
              >
                A · {originMarker.name}
              </span>
            </div>
          </MapItemMarker>
        )}

        {/* Selected Search Destination Pin */}
        {selectedDestination && (
          <MapItemMarker
            useOverlay={minimalMap}
            position={selectedDestination.position}
            zIndex={82}
            title={`Destino: ${selectedDestination.name}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shadow-xl border-2 border-white ${
                  minimalMap ? 'text-white' : 'text-teal-400'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <span className="mt-0.5 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-semibold shadow-lg border border-slate-700 max-w-[155px] truncate">
                B · {selectedDestination.name}
              </span>
            </div>
          </MapItemMarker>
        )}

        {/* Interactive Map Pin Picker (draggable) */}
        {mapPickMode && draftPickPosition && (
          <MapItemMarker
            useOverlay={minimalMap}
            position={draftPickPosition}
            zIndex={95}
            draggable={true}
            onDragEnd={(pos) => {
              onPickMapCoordinate?.(pos);
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
          </MapItemMarker>
        )}

        {/* User Current Location */}
        <MapItemMarker useOverlay={minimalMap} position={userPosition} zIndex={70} title="Tu ubicación GPS">
          <div className="relative flex items-center justify-center pointer-events-none">
            {!minimalMap && (
              <span className="w-7 h-7 rounded-full bg-[#0D9488]/25 animate-ping absolute" />
            )}
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${
                minimalMap ? 'bg-slate-700' : 'bg-[#0D9488]'
              }`}
            />
          </div>
        </MapItemMarker>
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
  minimalMap = false,
  onSelectRoute,
}: {
  routes: CompanyRouteItem[];
  selectedRouteId?: string | null;
  minimalMap?: boolean;
  onSelectRoute: (route: CompanyRouteItem) => void;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return;
    if (minimalMap && selectedRouteId) return;

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
  }, [map, mapsLib, routes, selectedRouteId, minimalMap, onSelectRoute]);

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
