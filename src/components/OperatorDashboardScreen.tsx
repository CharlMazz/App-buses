import React, {useMemo, useState} from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bus,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Megaphone,
  Minimize2,
  PieChart,
  Route,
  Settings,
  Tablet,
  TrendingUp,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import {INITIAL_FLEET_BUSES, formatCOP} from '../data/barranquillaTransit';
import type {FleetBus, OperationalIncident, ScreenId} from '../types/transit';
import {BarranquillaFleetMap} from './BarranquillaMaps';

interface OperatorDashboardScreenProps {
  extraPax: number;
  incidents: OperationalIncident[];
  onBroadcast: (message: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

type OperatorNavTab =
  | 'overview'
  | 'fleet'
  | 'routes'
  | 'drivers'
  | 'revenue'
  | 'analytics'
  | 'incidents';

export function OperatorDashboardScreen({
  extraPax,
  incidents,
  onBroadcast,
  onNavigate,
}: OperatorDashboardScreenProps) {
  const [activeNav, setActiveNav] = useState<OperatorNavTab>('overview');
  const [tableSearch, setTableSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState<'all' | 'troncal' | 'alimentador' | 'expreso'>('all');
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const [inspectedBus, setInspectedBus] = useState<FleetBus | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState(
    'Toda la red metropolitana (148 unidades)'
  );
  const [broadcastText, setBroadcastText] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    window.setTimeout(() => setActionFeedback(null), 2800);
  };

  const liveBuses = useMemo<FleetBus[]>(() => {
    return INITIAL_FLEET_BUSES.map((bus) => {
      if (bus.id !== 'B-304') return bus;
      return {
        ...bus,
        paxCurrent: Math.min(bus.paxMax, bus.paxCurrent + extraPax),
        revenueCop: bus.revenueCop + extraPax * 3100,
      };
    });
  }, [extraPax]);

  const filteredBuses = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return liveBuses.filter((b) => {
      if (!q) return true;
      return (
        b.id.toLowerCase().includes(q) ||
        b.routeLabel.toLowerCase().includes(q) ||
        b.driver.toLowerCase().includes(q)
      );
    });
  }, [liveBuses, tableSearch]);

  const totalPassengersToday = 84290 + extraPax;
  const totalRevenueMillions = (261.2 + (extraPax * 3100) / 1_000_000).toFixed(1);

  const handleExportCsv = () => {
    const headers = ['Bus ID', 'Ruta', 'Conductor', 'Ocupación', 'Recaudo COP', 'Estado'];
    const rows = liveBuses.map((b) => [
      `#${b.id}`,
      b.routeLabel,
      b.driver,
      `${b.paxCurrent}/${b.paxMax}`,
      b.revenueCop.toString(),
      b.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'informe-flota-baq.csv';
    link.click();
    URL.revokeObjectURL(url);
    triggerFeedback('Informe CSV de flota BAQ descargado');
  };

  const handleSendBroadcast = () => {
    const msg =
      broadcastText.trim() ||
      `Instrucción general para ${broadcastTarget}: mantener frecuencia en Troncal Cra 46.`;
    onBroadcast(msg);
    setBroadcastText('');
    setShowBroadcastModal(false);
    triggerFeedback('Comunicado transmitido a las consolas de conductores');
  };

  const navItems: Array<{id: OperatorNavTab; label: string; icon: React.ReactNode; badge?: number}> = [
    {id: 'overview', label: 'Visión General', icon: <LayoutDashboard className="w-4 h-4 text-teal-400" />},
    {id: 'fleet', label: 'Flota en Vivo', icon: <MapIcon className="w-4 h-4" />, badge: 148},
    {id: 'routes', label: 'Rutas & Horarios', icon: <Route className="w-4 h-4" />},
    {id: 'drivers', label: 'Conductores', icon: <BadgeCheck className="w-4 h-4" />},
    {id: 'revenue', label: 'Recaudo & Finanzas', icon: <CreditCard className="w-4 h-4" />},
    {id: 'analytics', label: 'Analítica Pasajeros', icon: <BarChart3 className="w-4 h-4" />},
    {
      id: 'incidents',
      label: 'Incidencias',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      badge: incidents.length,
    },
  ];

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 flex overflow-hidden">
      {/* Desktop Enterprise Sidebar Navigation */}
      <aside
        aria-label="Navegación del Centro de Control"
        className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 flex-col justify-between shrink-0 overflow-y-auto"
      >
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#0D9488] flex items-center justify-center text-white shadow-md">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-headline text-base font-bold text-white tracking-tight">
                APP BUSES
              </span>
              <p className="font-mono text-[11px] text-teal-400 tracking-wider font-semibold">
                OPS CONTROL • BAQ
              </p>
            </div>
          </div>

          <nav className="p-3 space-y-1 text-sm font-medium">
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.id === 'fleet') {
                      document.getElementById('fleetMapSection')?.scrollIntoView({behavior: 'smooth'});
                    } else if (item.id === 'incidents') {
                      document.getElementById('incidentsSection')?.scrollIntoView({behavior: 'smooth'});
                    } else if (item.id === 'drivers' || item.id === 'routes') {
                      document.getElementById('fleetTableSection')?.scrollIntoView({behavior: 'smooth'});
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                    active
                      ? 'bg-slate-800 text-white font-semibold border-l-4 border-[#0D9488]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-auto px-1.5 py-0.5 rounded-full font-mono text-[11px] tabular-nums ${
                        item.id === 'incidents'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-teal-950 text-teal-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User / Admin Profile & Quick Role Switcher */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-headline text-xs font-bold">
                AD
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Ing. A. Domínguez</p>
                <p className="font-mono text-[11px] text-slate-400">Super-Admin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerFeedback('Preferencias del Centro de Control BAQ activas')}
              aria-label="Ajustes de cuenta"
              className="text-slate-400 hover:text-white p-1"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>Vistas:</span>
            <button
              type="button"
              onClick={() => onNavigate('mapa')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800"
            >
              Pasajero
            </button>
            <button
              type="button"
              onClick={() => onNavigate('conductor')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800"
            >
              Conductor
            </button>
          </div>
        </div>
      </aside>

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Action Bar */}
        <header className="min-h-16 px-4 md:px-8 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-headline text-base md:text-lg text-white font-bold">
              Monitoreo de Transporte Metropolitano
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500 font-mono text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TELEMETRÍA EN VIVO • BAQ</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('mapa')}
              className="md:hidden px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold"
            >
              Volver a Pasajero
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>Distrito Barranquilla</span>
            </div>
            <span className="hidden sm:inline font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
              17 Nov • 10:24 AM
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Exportar Informe</span>
            </button>
          </div>
        </header>

        {/* Main Dashboard Content Grid */}
        <main className="p-4 md:p-8 space-y-6">
          {/* KPI Summary Cards Row */}
          <section
            aria-label="Métricas Principales de Operación"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <article className="p-5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Flota Activa en Calle</span>
                <Bus className="w-4 h-4 text-teal-400" />
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl text-white font-bold tabular-nums">
                  148
                </span>
                <span className="font-mono text-xs text-slate-400"> / 160 buses</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>92.5% Disponibilidad</span>
              </div>
            </article>

            <article className="p-5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pasajeros Hoy</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl text-white font-bold tabular-nums">
                  {totalPassengersToday.toLocaleString('es-CO')}
                </span>
                <span className="font-mono text-xs text-slate-400"> validados</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+8.4% semanal</span>
              </div>
            </article>

            <article className="p-5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recaudo Digital</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl text-teal-300 font-bold tabular-nums font-mono">
                  ${totalRevenueMillions}M
                </span>
                <span className="font-mono text-xs text-slate-400"> COP</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                <span className="text-teal-400 font-bold">98.2%</span>
                <span>vía QR y NFC</span>
              </div>
            </article>

            <article className="p-5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ocupación Promedio</span>
                <PieChart className="w-4 h-4 text-amber-400" />
              </div>
              <div className="my-2 flex items-center gap-2">
                <span className="font-headline text-3xl text-amber-400 font-bold tabular-nums">
                  58%
                </span>
                <span className="font-mono text-xs text-slate-400">Moderado</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{width: '58%'}} />
              </div>
            </article>
          </section>

          {/* Center Operational Core: Real Barranquilla Fleet Map + Incidents */}
          <section className="grid grid-cols-12 gap-6 items-start">
            {/* Live Fleet Telemetry Map */}
            <div
              id="fleetMapSection"
              className={`bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 ${
                mapFullscreen ? 'col-span-12' : 'col-span-12 xl:col-span-8'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-teal-400" />
                  <h2 className="font-headline text-base text-white font-bold">
                    Rastreo Satelital de Flota en Vivo
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={routeFilter}
                    onChange={(e) =>
                      setRouteFilter(
                        e.target.value as 'all' | 'troncal' | 'alimentador' | 'expreso'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-slate-800 font-mono text-xs text-slate-200 border border-slate-700"
                  >
                    <option value="all">Todas las Rutas</option>
                    <option value="troncal">Solo Troncales</option>
                    <option value="alimentador">Solo Alimentadores</option>
                    <option value="expreso">Solo Expresos</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setMapFullscreen((f) => !f)}
                    aria-label="Pantalla completa"
                    className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                  >
                    {mapFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Real Barranquilla Dark Google Map Viewport */}
              <div
                className={`relative w-full bg-slate-900 rounded-md overflow-hidden border border-slate-800 transition-all ${
                  mapFullscreen ? 'h-[500px]' : 'h-[360px]'
                }`}
              >
                <BarranquillaFleetMap
                  buses={liveBuses}
                  routeCategoryFilter={routeFilter}
                  onInspectBus={(bus) => setInspectedBus(bus)}
                />

                {/* Map Floating Info Overlay */}
                <div className="absolute bottom-3 left-3 z-10 bg-slate-950/95 border border-slate-800 p-2.5 rounded font-mono text-[11px] space-y-1 pointer-events-none">
                  <p className="text-slate-400">RED METROPOLITANA BARRANQUILLA</p>
                  <div className="flex flex-wrap items-center gap-3 text-slate-200">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Troncales: 64
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Alimentadores: 84
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Expresos: 12
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Operational Alerts & Dispatch Communications */}
            <div
              id="incidentsSection"
              className={`bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 ${
                mapFullscreen ? 'col-span-12' : 'col-span-12 xl:col-span-4'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-base text-white font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Incidencias Operativas</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-mono text-[11px] font-bold">
                  {incidents.length} CRÍTICAS
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-0.5">
                {incidents.map((inc) => {
                  const isCritical = inc.severity === 'critical';
                  const isWarn = inc.severity === 'warning';
                  return (
                    <div
                      key={inc.id}
                      className={`p-3.5 rounded-md border space-y-1.5 ${
                        isCritical
                          ? 'bg-red-950/70 border-red-500'
                          : isWarn
                          ? 'bg-amber-950/60 border-amber-500'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between font-mono text-[11px] ${
                          isCritical
                            ? 'text-red-300'
                            : isWarn
                            ? 'text-amber-300'
                            : 'text-teal-400'
                        }`}
                      >
                        <span className="font-bold">{inc.title}</span>
                        <span>{inc.timeAgo}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{inc.description}</p>
                      {inc.actions && inc.actions.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              triggerFeedback('Plan de desvío activado para rutas A-04 y T-01 en Vía 40')
                            }
                            className="px-2.5 py-1 rounded bg-slate-800 border border-amber-500 text-amber-300 font-mono text-[11px] hover:bg-slate-700"
                          >
                            Desviar Flota
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              triggerFeedback('Conectando cámara vial Vía 40 con Calle 76...')
                            }
                            className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] hover:bg-slate-700"
                          >
                            Ver Cámaras
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(true)}
                  className="w-full py-2.5 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Megaphone className="w-4 h-4 text-teal-400" />
                  <span>Enviar Comunicado General</span>
                </button>
              </div>
            </div>
          </section>

          {/* Bottom Detailed Fleet Table */}
          <section
            id="fleetTableSection"
            aria-label="Detalle de Flota Activa"
            className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-base text-white font-bold">
                  Monitoreo Detallado de Vehículos
                </h2>
                <p className="text-xs text-slate-400">
                  Telemetría, ocupación en tiempo real y recaudación por unidad.
                </p>
              </div>
              <input
                type="search"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar bus o conductor..."
                className="px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bus ID</th>
                    <th className="py-3 px-4">Ruta Asignada</th>
                    <th className="py-3 px-4">Conductor</th>
                    <th className="py-3 px-4">Ocupación (APC)</th>
                    <th className="py-3 px-4">GPS / Hardware</th>
                    <th className="py-3 px-4">Recaudo Turno</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px] text-slate-300">
                  {filteredBuses.map((bus) => {
                    const pct = Math.round((bus.paxCurrent / bus.paxMax) * 100);
                    return (
                      <tr key={bus.id} className="hover:bg-slate-900 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                bus.hasDelay ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                            />
                            #{bus.id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              bus.category === 'troncal'
                                ? 'bg-[#2563EB] text-white'
                                : bus.category === 'alimentador'
                                ? 'bg-slate-950 text-emerald-300 border border-emerald-500'
                                : 'bg-[#DC2626] text-white'
                            }`}
                          >
                            {bus.routeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-200">{bus.driver}</td>
                        <td className="py-3 px-4 tabular-nums">
                          <span
                            className={`px-2.5 py-1 rounded-full bg-slate-950 border font-bold ${
                              pct >= 80
                                ? 'text-rose-300 border-rose-500'
                                : pct >= 40
                                ? 'text-amber-300 border-amber-500'
                                : 'text-emerald-300 border-emerald-500'
                            }`}
                          >
                            {pct}% ({bus.paxCurrent} / {bus.paxMax} pax)
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 ${
                            bus.hasDelay ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {bus.hasDelay ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : (
                              <Wifi className="w-3.5 h-3.5" />
                            )}
                            {bus.hasDelay ? bus.status : 'Conectado 4G'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-teal-300 font-bold tabular-nums">
                          {formatCOP(bus.revenueCop)} COP
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => setInspectedBus(bus)}
                            className="text-teal-400 hover:text-teal-300 font-medium"
                          >
                            Inspeccionar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Bus Telemetry Inspection Modal */}
      {inspectedBus && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-[20px] max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#0D9488] text-white flex items-center justify-center shadow">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-white">
                    Unidad #{inspectedBus.id}
                  </h3>
                  <span className="font-mono text-xs text-teal-400">{inspectedBus.routeLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedBus(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <p className="text-slate-400">Conductor en Cabina:</p>
                <p className="text-sm font-semibold text-white mt-0.5">{inspectedBus.driver}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <p className="text-slate-400">Ocupación APC Actual:</p>
                <p className="text-sm font-semibold text-teal-300 mt-0.5 tabular-nums">
                  {inspectedBus.paxCurrent} / {inspectedBus.paxMax} pax
                </p>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <p className="text-slate-400">Recaudo Turno:</p>
                <p className="text-sm font-semibold text-emerald-400 mt-0.5 tabular-nums">
                  {formatCOP(inspectedBus.revenueCop)} COP
                </p>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <p className="text-slate-400">Estado de Operación:</p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">{inspectedBus.status}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setInspectedBus(null);
                  onNavigate('conductor');
                }}
                className="px-4 py-2.5 rounded-md bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Tablet className="w-4 h-4" />
                <span>Ver Consola de Conducción</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectedBus(null)}
                className="px-4 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Dispatch Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded-[20px] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-headline text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-teal-400" />
                <span>Emitir Comunicado a Flota</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-mono text-[11px] text-slate-300 mb-1">
                  Destinatarios:
                </label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-white font-mono text-xs"
                >
                  <option>Toda la red metropolitana (148 unidades)</option>
                  <option>Solo Corredor Troncal T-01</option>
                  <option>Solo Corredores Alimentadores</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-slate-300 mb-1">
                  Mensaje de Despacho:
                </label>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-white text-xs"
                  placeholder="Escriba la instrucción de tráfico o desvío..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="py-2.5 px-4 rounded-md bg-slate-800 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                className="py-2.5 px-4 rounded-md bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Transmitir Mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2.5 rounded-lg border border-teal-500 shadow-2xl font-mono text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{actionFeedback}</span>
        </div>
      )}
    </div>
  );
}
