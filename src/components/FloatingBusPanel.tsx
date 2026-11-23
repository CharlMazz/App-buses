import React from 'react';
import {
  Accessibility,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  QrCode,
  Route,
  Snowflake,
  Users,
  X,
} from 'lucide-react';
import {formatCOP, formatDistanceLabel} from '../data/barranquillaTransit';
import type {SelectedBusDetails} from '../utils/busTelemetry';

interface FloatingBusPanelProps {
  bus: SelectedBusDetails;
  companyBadgeClass: string;
  isRouteActive: boolean;
  onFocusBus: () => void;
  onViewRoute: () => void;
  onBuyTicket: () => void;
  onClose: () => void;
}

export function FloatingBusPanel({
  bus,
  companyBadgeClass,
  isRouteActive,
  onFocusBus,
  onViewRoute,
  onBuyTicket,
  onClose,
}: FloatingBusPanelProps) {
  const occBarColor =
    bus.occupancyLevel === 'low'
      ? 'bg-emerald-600'
      : bus.occupancyLevel === 'medium'
      ? 'bg-amber-500'
      : 'bg-rose-600';

  const occTextColor =
    bus.occupancyLevel === 'low'
      ? 'text-emerald-700'
      : bus.occupancyLevel === 'medium'
      ? 'text-amber-700'
      : 'text-rose-700';

  const pickupDistanceText =
    bus.pickupDistanceMeters <= 60
      ? 'Pasa justo por tu punto'
      : `Paradero a ${formatDistanceLabel(bus.pickupDistanceMeters)} caminando`;

  return (
    <aside
      role="region"
      aria-label={`Detalle del bus ${bus.routeCode} de ${bus.company}`}
      data-testid="floating-bus-panel"
      className="absolute bottom-3 left-2.5 right-2.5 z-30 mx-auto max-w-md sm:max-w-lg bg-white/95 backdrop-blur-md rounded-[18px] shadow-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3 pointer-events-auto"
    >
      {/* Header: Route Identity + Close */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onFocusBus}
            aria-label={`Centrar mapa en ${bus.routeCode}`}
            className={`px-2.5 py-1 ${companyBadgeClass} text-white font-headline text-xs font-bold rounded-[8px] shrink-0 mt-0.5 shadow-xs hover:opacity-95 transition-opacity cursor-pointer`}
          >
            {bus.routeCode}
          </button>
          <div className="min-w-0">
            <h3 className="font-headline text-sm font-bold text-slate-900 leading-snug truncate">
              {bus.company} · {bus.routeName}
            </h3>
            <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
              <span>{bus.unitLabel}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono">{bus.plate}</span>
              <span aria-hidden="true"> · </span>
              <span>{bus.directionLabel}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle del bus"
          className="min-h-[40px] min-w-[40px] w-10 h-10 -mt-1 -mr-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics: ETA to User/Pickup + Occupancy Level */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Estimated Arrival */}
        <div className="rounded-[12px] bg-slate-50 border border-slate-200/80 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
            <span className="truncate">
              {bus.isCustomPickup ? 'A tu punto de recogida' : 'Cerca de donde estás'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              data-testid="bus-panel-eta"
              className="font-headline text-lg sm:text-xl font-bold text-[#0D9488] tabular-nums leading-tight"
            >
              ~{bus.etaMinutes} min
            </span>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              a {formatDistanceLabel(bus.busDistanceMeters)}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 truncate tabular-nums">{pickupDistanceText}</p>
        </div>

        {/* Bus Occupancy Level */}
        <div className="rounded-[12px] bg-slate-50 border border-slate-200/80 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">Ocupación</span>
            </span>
            <span
              data-testid="bus-panel-occupancy-label"
              className={`font-semibold shrink-0 ${occTextColor}`}
            >
              {bus.occupancyLabel.replace('Ocupación ', '')}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-1">
            <span
              data-testid="bus-panel-occupancy-pct"
              className="font-headline text-lg sm:text-xl font-bold text-slate-900 tabular-nums leading-tight"
            >
              {bus.occupancyPct}%
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums truncate">
              {bus.passengersCurrent}/{bus.passengersCapacity} pax
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Nivel de ocupación del bus"
            aria-valuenow={bus.occupancyPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden"
          >
            <div
              style={{width: `${Math.min(100, Math.max(4, bus.occupancyPct))}%`}}
              className={`h-full rounded-full transition-all duration-300 ${occBarColor}`}
            />
          </div>

          <p className="text-[10.5px] text-slate-500 truncate">{bus.occupancyHint}</p>
        </div>
      </div>

      {/* Secondary Telemetry & Service Info ("Otros datos") */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-3 gap-y-2 text-[11.5px]">
        <div className="flex items-start gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10.5px] text-slate-500 leading-none">Punto de recogida</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5">{bus.pickupPointName}</p>
          </div>
        </div>

        <div className="flex items-start gap-1.5 min-w-0">
          <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10.5px] text-slate-500 leading-none">Próximo sector</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5">{bus.nextStopName}</p>
          </div>
        </div>

        <div className="flex items-start gap-1.5 min-w-0">
          <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10.5px] text-slate-500 leading-none">Velocidad y estado</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5 tabular-nums">
              {bus.speedKmh} km/h · {bus.serviceStatus.replace('En recorrido · ', '')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-1.5 min-w-0">
          {bus.hasAc ? (
            <Snowflake className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          ) : (
            <Accessibility className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-[10.5px] text-slate-500 leading-none">Servicio y frecuencia</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5 tabular-nums">
              {bus.frequencyLabel}
              {bus.hasAc ? ' · Aire acond.' : ''}
              {bus.hasAccessibility ? ' · PMR' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={bus.routeRef && !isRouteActive ? onViewRoute : onFocusBus}
          className="min-h-[44px] px-3.5 py-2 rounded-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Route className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
          <span>{bus.routeRef && !isRouteActive ? 'Ver ruta' : 'Centrar bus'}</span>
        </button>

        <button
          type="button"
          onClick={onBuyTicket}
          className="flex-1 min-h-[44px] px-3.5 py-2 rounded-[11px] bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold flex items-center justify-between gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">Comprar pasaje QR</span>
          </span>
          <span className="font-mono text-[11px] font-bold tabular-nums shrink-0">
            {formatCOP(bus.fareCop)}
          </span>
        </button>
      </div>
    </aside>
  );
}
