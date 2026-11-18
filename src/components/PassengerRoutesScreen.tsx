import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Compass,
  MapPin,
  Maximize2,
  Minus,
  Monitor,
  Plus,
  QrCode,
  Route,
  Search,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  BUS_COMPANIES,
  COMPANY_BUS_ROUTES,
  type CompanyRouteItem,
} from '../data/busRoutesCatalog';
import {formatCOP, routeIntersectsBounds} from '../data/barranquillaTransit';
import type {LatLng, MapBounds, ScreenId} from '../types/transit';
import {BarranquillaRoutesMap, type MapControlSignal} from './BarranquillaMaps';

const COMPANY_BADGE_CLASSES: Record<string, string> = {
  Coolitoral: 'bg-sky-600',
  Coochofal: 'bg-red-600',
  Sobusa: 'bg-green-600',
  'La Carolina': 'bg-teal-600',
  Sodetrans: 'bg-violet-600',
  Transdiaz: 'bg-blue-600',
  Transurbar: 'bg-orange-600',
  Monterrey: 'bg-emerald-600',
  'Lucero San Felipe': 'bg-amber-600',
  Cootransnorte: 'bg-cyan-600',
  'Flota Ángulo': 'bg-purple-600',
  'Flota Roja': 'bg-rose-700',
  Lolaya: 'bg-green-700',
  Trasalianco: 'bg-blue-700',
  Trasalfa: 'bg-indigo-600',
  Cootrab: 'bg-teal-700',
  Cootransco: 'bg-emerald-700',
  Cootransporcar: 'bg-orange-700',
  Cootrasol: 'bg-sky-700',
  Cooasoatlán: 'bg-violet-700',
  Transmecar: 'bg-amber-700',
  Transoledad: 'bg-rose-600',
  Embusa: 'bg-indigo-700',
  Cootracolsur: 'bg-slate-700',
};

function getCompanyBadgeClass(company: string): string {
  return COMPANY_BADGE_CLASSES[company] ?? 'bg-teal-700';
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const ZONE_PRESETS: Array<{id: string; label: string; target: LatLng; zoom: number}> = [
  {id: 'all', label: 'Toda BAQ', target: {lat: 10.978, lng: -74.803}, zoom: 13},
  {id: 'norte', label: 'Norte / Riomar', target: {lat: 11.0085, lng: -74.813}, zoom: 14},
  {id: 'centro', label: 'Prado / Centro', target: {lat: 10.985, lng: -74.788}, zoom: 14},
  {id: 'via40', label: 'Vía 40', target: {lat: 11.004, lng: -74.794}, zoom: 14},
  {id: 'sur', label: 'Sur / Soledad', target: {lat: 10.946, lng: -74.798}, zoom: 14},
];

interface PassengerRoutesScreenProps {
  balance: number;
  onNavigate: (screen: ScreenId) => void;
  onExploreRoute: (route: CompanyRouteItem) => void;
}

export function PassengerRoutesScreen({
  balance,
  onNavigate,
  onExploreRoute,
}: PassengerRoutesScreenProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [filterByMapBounds, setFilterByMapBounds] = useState(true);
  const [activeZoneId, setActiveZoneId] = useState('all');
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<CompanyRouteItem | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [mapSignal, setMapSignal] = useState<MapControlSignal | null>(null);
  const [zoomState, setZoomState] = useState<{zoom: number; isAtDefault: boolean}>({
    zoom: 13,
    isAtDefault: true,
  });

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const triggerSignal = useCallback(
    (type: MapControlSignal['type'], target?: LatLng, zoom?: number) => {
      setMapSignal({type, target, zoom, nonce: Date.now()});
    },
    []
  );

  const handleCameraSync = useCallback((zoom: number, isAtDefault: boolean) => {
    setZoomState({zoom, isAtDefault});
  }, []);

  const handleBoundsChanged = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const baseMatches = useMemo(() => {
    const q = normalizeText(searchText.trim());
    return COMPANY_BUS_ROUTES.filter((r) => {
      const matchesCompany = selectedCompany === 'all' || r.company === selectedCompany;
      const matchesQuery =
        !q ||
        normalizeText(r.code).includes(q) ||
        normalizeText(r.company).includes(q) ||
        normalizeText(r.description).includes(q) ||
        normalizeText(r.corridor).includes(q);
      return matchesCompany && matchesQuery;
    });
  }, [searchText, selectedCompany]);

  const filteredRoutes = useMemo(() => {
    if (!filterByMapBounds || !mapBounds) return baseMatches;
    return baseMatches.filter((r) => routeIntersectsBounds(r.center, r.path, mapBounds));
  }, [baseMatches, filterByMapBounds, mapBounds]);

  const handleSelectRoute = useCallback(
    (route: CompanyRouteItem) => {
      setSelectedRoute(route);
      triggerSignal('focus', route.center, 14);
      setToastMsg(`${route.company} · Ruta ${route.code}`);
    },
    [triggerSignal]
  );

  const handleSelectZone = (zone: (typeof ZONE_PRESETS)[number]) => {
    setActiveZoneId(zone.id);
    setFilterByMapBounds(true);
    triggerSignal('focus', zone.target, zone.zoom);
  };

  return (
    <div className="@container relative w-full h-full max-w-[960px] mx-auto bg-white flex flex-col overflow-hidden border-x border-slate-200">
      {/* Compact Top Search & Map-Based Filter Header */}
      <header className="shrink-0 z-30 bg-white border-b border-slate-200 px-3 py-2 space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <Route className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-headline text-sm font-bold text-slate-900 truncate">
                Rutas de Buses · BAQ
              </h1>
              <p className="text-[10.5px] text-slate-500 truncate">
                {filteredRoutes.length} de {COMPANY_BUS_ROUTES.length}{' '}
                {filterByMapBounds ? 'visibles en esta zona del mapa' : 'en toda Barranquilla'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterByMapBounds((v) => !v)}
            aria-pressed={filterByMapBounds}
            className={`min-h-[30px] px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors shrink-0 ${
              filterByMapBounds
                ? 'bg-teal-50 text-[#0D9488] border-[#0D9488]'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {filterByMapBounds ? 'Según el mapa ✓' : 'Ver todas'}
          </button>
        </div>

        {/* Search + Company Dropdown */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-12 gap-1.5">
          <div className="@[480px]:col-span-7 relative flex items-center">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 z-10 pointer-events-none"
            />
            <input
              type="text"
              aria-label="Buscar ruta, código, empresa o barrio"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar ruta, empresa, barrio o vía..."
              className="w-full h-8 pl-8 pr-7 py-0 leading-normal rounded-[8px] bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                aria-label="Limpiar búsqueda"
                className="p-1 absolute right-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="@[480px]:col-span-5">
            <select
              aria-label="Filtrar por empresa"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full h-8 px-2.5 py-0 rounded-[8px] bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="all">Todas las empresas ({BUS_COMPANIES.length})</option>
              {BUS_COMPANIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barranquilla Zone Quick-Jumps */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {ZONE_PRESETS.map((zone) => {
            const active = activeZoneId === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => handleSelectZone(zone)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Interactive Map Filtering Routes by Viewport */}
      <main className="relative flex-1 min-h-[220px] w-full bg-[#E8ECEF] overflow-hidden">
        <BarranquillaRoutesMap
          routes={filteredRoutes}
          selectedRoute={selectedRoute}
          signal={mapSignal}
          onBoundsChanged={handleBoundsChanged}
          onSelectRoute={handleSelectRoute}
          onCameraSync={handleCameraSync}
        />

        {/* Map Zoom Controls */}
        <aside
          aria-label="Controles del mapa de rutas"
          className="absolute right-3 top-3 z-20 flex flex-col gap-1.5"
        >
          <div
            role="group"
            aria-label="Zoom del mapa"
            className="w-9 rounded-full bg-white text-slate-900 shadow-lg border border-slate-200 flex flex-col overflow-hidden"
          >
            <button
              type="button"
              aria-label="Acercar"
              disabled={zoomState.zoom >= 18}
              onClick={() => triggerSignal('zoomIn')}
              className="w-9 h-8 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Alejar"
              disabled={zoomState.zoom <= 11}
              onClick={() => triggerSignal('zoomOut')}
              className="w-9 h-8 flex items-center justify-center border-t border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Restablecer vista"
              disabled={zoomState.isAtDefault}
              onClick={() => {
                setActiveZoneId('all');
                triggerSignal('reset');
              }}
              className="w-9 h-8 flex items-center justify-center border-t border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      </main>

      {/* Compact Bottom Routes Results Drawer */}
      <section
        aria-label="Listado de rutas según el mapa"
        className={`relative z-30 shrink-0 min-h-0 bg-white rounded-t-[20px] shadow-[0_-6px_24px_rgba(0,0,0,0.1)] border-t border-slate-200 px-3.5 pt-1.5 pb-3 flex flex-col gap-2 transition-all ${
          sheetExpanded ? 'max-h-[68%]' : 'max-h-[29%]'
        }`}
      >
        <button
          type="button"
          onClick={() => setSheetExpanded((s) => !s)}
          aria-label="Expandir o contraer lista de rutas"
          className="w-10 h-1 bg-slate-300 rounded-full mx-auto hover:bg-slate-400 transition-colors"
        />

        <div className="flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSheetExpanded((s) => !s)}
            className="text-xs font-bold text-slate-900 hover:text-[#0D9488] transition-colors"
          >
            Rutas encontradas ({filteredRoutes.length}) · {sheetExpanded ? 'Contraer' : 'Ver más'}
          </button>
          {selectedRoute && (
            <button
              type="button"
              onClick={() => setSelectedRoute(null)}
              className="text-[11px] text-slate-500 hover:text-slate-900 font-medium"
            >
              Limpiar selección
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 @[560px]:grid-cols-2 gap-2 overflow-y-auto pr-0.5 pb-14 content-start">
          {filteredRoutes.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-500 space-y-2">
              <p>No hay rutas visibles en esta área del mapa con los filtros actuales.</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterByMapBounds(false);
                    setSearchText('');
                    setSelectedCompany('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
                >
                  Mostrar las 91 rutas
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectZone(ZONE_PRESETS[0])}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                >
                  Alejar mapa
                </button>
              </div>
            </div>
          ) : (
            filteredRoutes.map((route) => {
              const isSelected = selectedRoute?.id === route.id;
              return (
                <article
                  key={route.id}
                  onClick={() => handleSelectRoute(route)}
                  className={`p-3 rounded-[14px] border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-[#0D9488] ring-1 ring-[#0D9488]'
                      : 'bg-slate-50 border-slate-200 hover:border-[#0D9488]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`px-2 py-1 ${getCompanyBadgeClass(
                          route.company
                        )} text-white font-headline text-xs font-bold rounded-[6px] shrink-0 mt-0.5`}
                      >
                        {route.code}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 leading-snug">
                          {route.company}
                        </h3>
                        <p className="text-xs text-slate-700 leading-snug mt-0.5">
                          {route.description}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                          {route.corridor}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                        {formatCOP(route.fareCop)}
                      </span>
                      <p className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                        c/{route.etaMinutes} min
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Trazada en mapa' : 'Ver recorrido'}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExploreRoute(route);
                        }}
                        className="min-h-8 px-2.5 py-1 rounded bg-[#0D9488] hover:bg-teal-700 text-white text-[11px] font-medium flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Explorar cerca</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('billetera');
                        }}
                        className="min-h-8 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium active:scale-95 transition-all"
                      >
                        QR Pasaje
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* X-style Single Floating Action Button & Expandable Navigation Menu */}
      {fabMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setFabMenuOpen(false)}
          className="absolute inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px]"
        />
      )}

      <nav
        aria-label="Menú rápido de la aplicación"
        className="absolute bottom-4 left-4 z-40 flex flex-col items-start gap-2.5"
      >
        {fabMenuOpen && (
          <ul className="flex flex-col items-start gap-2 mb-0.5 pl-1.5">
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  setShowRolesModal(true);
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Users className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Roles
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  onNavigate('billetera');
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Wallet className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Billetera ({formatCOP(balance)})
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  onNavigate('mapa');
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-slate-700 group-hover:text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Compass className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Explorar mapa
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setFabMenuOpen(false)}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-white text-[#0D9488] shadow-lg border border-slate-200 flex items-center justify-center transition-colors">
                  <Route className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-lg border border-slate-200">
                  Rutas (Actual)
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setFabMenuOpen(false);
                  onNavigate('billetera');
                }}
                className="flex items-center gap-2.5 group"
              >
                <span className="w-11 h-11 rounded-full bg-[#0D9488] text-white shadow-lg border-2 border-white flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg">
                  Ticket QR
                </span>
              </button>
            </li>
          </ul>
        )}

        <button
          type="button"
          onClick={() => setFabMenuOpen((open) => !open)}
          aria-expanded={fabMenuOpen}
          aria-label={fabMenuOpen ? 'Cerrar menú rápido' : 'Abrir menú de acciones'}
          className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-[0_8px_24px_rgba(13,148,136,0.45)] border-2 border-white active:scale-95 transition-all cursor-pointer ${
            fabMenuOpen ? 'bg-slate-900' : 'bg-[#0D9488] hover:bg-teal-700'
          }`}
        >
          <Plus
            className={`w-7 h-7 transition-transform duration-200 ${
              fabMenuOpen ? 'rotate-45' : ''
            }`}
          />
        </button>
      </nav>

      {/* Role Switcher Modal */}
      {showRolesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0D9488]" />
                <h3 className="font-headline text-base font-bold text-slate-900">
                  Ecosistema APP BUSES
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRolesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setShowRolesModal(false)}
                className="w-full text-left p-3 rounded-lg border-2 border-[#0D9488] bg-teal-50/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">App Pasajero (Actual)</p>
                    <p className="text-[11px] text-slate-500">
                      Rutas, Explorar Mapa y Billetera Digital
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  onNavigate('conductor');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bus className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">App Conductor (Tableta)</p>
                    <p className="text-[11px] text-slate-500">
                      Navegación, Validador QR y Conteo APC
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRolesModal(false);
                  onNavigate('operador');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Centro de Control (Operador Web)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Telemetría de Flota, Recaudo e Incidencias
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
