import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Route,
  Search,
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
import {PassengerBottomNav} from './PassengerBottomNav';

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
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<CompanyRouteItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
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

  const hasActiveFilter =
    searchText.trim().length > 0 ||
    selectedCompany !== 'all' ||
    !filterByMapBounds ||
    selectedRoute !== null;

  const filteredRoutes = useMemo(() => {
    if (!hasActiveFilter) return [];
    if (!filterByMapBounds || !mapBounds) return baseMatches;
    return baseMatches.filter((r) => routeIntersectsBounds(r.center, r.path, mapBounds));
  }, [hasActiveFilter, baseMatches, filterByMapBounds, mapBounds]);

  const handleSelectRoute = useCallback(
    (route: CompanyRouteItem) => {
      setSelectedRoute(route);
      triggerSignal('focus', route.center, 14);
      setToastMsg(`${route.company} · Ruta ${route.code}`);
    },
    [triggerSignal]
  );

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
                {hasActiveFilter
                  ? `${filteredRoutes.length} rutas filtradas ${
                      filterByMapBounds ? 'en esta zona del mapa' : 'en toda Barranquilla'
                    }`
                  : `Filtra por ruta o empresa (${COMPANY_BUS_ROUTES.length} disponibles)`}
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
              onClick={() => triggerSignal('reset')}
              className="w-9 h-8 flex items-center justify-center border-t border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-35"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
        {/* Clickable trigger pill to open the hidden bottom routes panel */}
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-expanded={false}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-lg flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all whitespace-nowrap"
          >
            <Route className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>
              {hasActiveFilter
                ? `Ver rutas filtradas (${filteredRoutes.length})`
                : 'Ver rutas filtradas'}
            </span>
            <ChevronUp className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </main>

      {/* Bottom Routes Results Drawer (hidden by default, opens when clicked) */}
      {panelOpen && (
        <section
          aria-label="Listado de rutas según el mapa"
          className="relative z-30 shrink-0 min-h-0 max-h-[58%] bg-white rounded-t-[20px] shadow-[0_-6px_24px_rgba(0,0,0,0.1)] border-t border-slate-200 px-3.5 pt-1.5 pb-3 flex flex-col gap-2 transition-all"
        >
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="Cerrar lista de rutas"
            className="w-10 h-1 bg-slate-300 rounded-full mx-auto hover:bg-slate-400 transition-colors"
          />

          <div className="flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-xs font-bold text-slate-900 hover:text-[#0D9488] transition-colors flex items-center gap-1"
            >
              <span>
                {hasActiveFilter
                  ? `Rutas filtradas (${filteredRoutes.length})`
                  : 'Rutas filtradas (0)'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
            <div className="flex items-center gap-2">
              {selectedRoute && (
                <button
                  type="button"
                  onClick={() => setSelectedRoute(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 font-medium"
                >
                  Limpiar selección
                </button>
              )}
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-semibold"
              >
                Ocultar
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 @[560px]:grid-cols-2 gap-2 overflow-y-auto pr-0.5 pb-14 content-start">
            {!hasActiveFilter ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500 space-y-2">
                <p>
                  Aplica un filtro arriba (búsqueda o empresa) para mostrar solo las rutas
                  filtradas.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterByMapBounds(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-medium hover:bg-teal-700"
                  >
                    Mostrar todas ({COMPANY_BUS_ROUTES.length})
                  </button>
                </div>
              </div>
            ) : filteredRoutes.length === 0 ? (
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
                    Mostrar las {COMPANY_BUS_ROUTES.length} rutas
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerSignal('reset')}
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
      )}

      <PassengerBottomNav
        currentScreen="rutas"
        balance={balance}
        onNavigate={onNavigate}
      />

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
