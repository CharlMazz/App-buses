import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Bus,
  CheckCircle2,
  Compass,
  CreditCard,
  Lock,
  Monitor,
  Nfc,
  PlusCircle,
  QrCode,
  Receipt,
  RefreshCw,
  Route,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {formatCOP} from '../data/barranquillaTransit';
import type {ScreenId, WalletTransaction} from '../types/transit';

interface PassengerWalletScreenProps {
  balance: number;
  transactions: WalletTransaction[];
  onTopUp: (amount: number, methodLabel: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

const PRESET_AMOUNTS = [10000, 20000, 50000];

const PAYMENT_METHODS = [
  {id: 'nequi', name: 'Nequi Colombia', detail: '300 ••• •452', badge: 'N', color: 'bg-[#1F0433]'},
  {id: 'pse', name: 'PSE Bancolombia', detail: 'Cuenta Ahorros •891', badge: 'P', color: 'bg-amber-500'},
  {id: 'card', name: 'Tarjeta Débito Visa', detail: '•••• 4821', badge: 'V', color: 'bg-blue-700'},
];

const QR_DATA_CELLS: Array<{x: number; y: number; w: number; h: number; accent?: boolean}> = [
  {x: 42, y: 8, w: 6, h: 6},
  {x: 52, y: 8, w: 8, h: 6},
  {x: 66, y: 8, w: 6, h: 12},
  {x: 42, y: 20, w: 12, h: 6},
  {x: 60, y: 20, w: 6, h: 6, accent: true},
  {x: 72, y: 20, w: 6, h: 6},
  {x: 8, y: 44, w: 6, h: 8},
  {x: 20, y: 44, w: 8, h: 6},
  {x: 34, y: 44, w: 12, h: 12},
  {x: 52, y: 40, w: 16, h: 6, accent: true},
  {x: 74, y: 40, w: 6, h: 10},
  {x: 86, y: 44, w: 14, h: 6},
  {x: 106, y: 44, w: 6, h: 12},
  {x: 8, y: 60, w: 12, h: 6},
  {x: 26, y: 60, w: 6, h: 12, accent: true},
  {x: 38, y: 64, w: 16, h: 6},
  {x: 60, y: 56, w: 10, h: 14},
  {x: 76, y: 60, w: 6, h: 6, accent: true},
  {x: 88, y: 58, w: 14, h: 8},
  {x: 44, y: 82, w: 8, h: 6},
  {x: 58, y: 82, w: 12, h: 8, accent: true},
  {x: 76, y: 80, w: 10, h: 12},
  {x: 92, y: 78, w: 6, h: 12},
  {x: 104, y: 80, w: 8, h: 6},
  {x: 44, y: 96, w: 14, h: 6},
  {x: 64, y: 98, w: 6, h: 12},
  {x: 76, y: 100, w: 14, h: 6, accent: true},
  {x: 96, y: 98, w: 14, h: 12},
];

export function PassengerWalletScreen({
  balance,
  transactions,
  onTopUp,
  onNavigate,
}: PassengerWalletScreenProps) {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const txSectionRef = useRef<HTMLElement | null>(null);

  const [ticketCode, setTicketCode] = useState('TK-BAQ-883492');
  const [qrSeed, setQrSeed] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(102);
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMethodIdx, setSelectedMethodIdx] = useState(0);
  const [customAmount, setCustomAmount] = useState('20000');
  const [txFilter, setTxFilter] = useState<'all' | 'trip' | 'topup'>('all');
  const [showAllTx, setShowAllTx] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 1 ? s - 1 : 120));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2500);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const formattedTimer = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60
  ).padStart(2, '0')} min`;

  const tripsCount = Math.floor(balance / 3100);
  const activeMethod = PAYMENT_METHODS[selectedMethodIdx];

  const visibleTransactions = useMemo(() => {
    const base =
      txFilter === 'all'
        ? transactions
        : transactions.filter((tx) => tx.type === txFilter);
    return showAllTx ? base : base.slice(0, 5);
  }, [transactions, txFilter, showAllTx]);

  const handleRefreshQr = () => {
    const rnd = Math.floor(100000 + Math.random() * 900000);
    setTicketCode(`TK-BAQ-${rnd}`);
    setQrSeed((s) => s + 1);
    setSecondsLeft(120);
    mainScrollRef.current?.scrollTo({top: 0, behavior: 'smooth'});
    setToastMsg('Nuevo código QR dinámico generado');
  };

  const handlePresetTopUp = (amt: number) => {
    onTopUp(amt, `Recarga Rápida ${activeMethod.name.split(' ')[0]}`);
    setToastMsg(`Recarga exitosa: +${formatCOP(amt)} vía ${activeMethod.name.split(' ')[0]}`);
  };

  const handleConfirmCustomTopUp = (e?: React.FormEvent) => {
    e?.preventDefault();
    const amt = Math.max(5000, parseInt(customAmount, 10) || 10000);
    onTopUp(amt, `Recarga ${activeMethod.name.split(' ')[0]}`);
    setShowTopUpModal(false);
    setToastMsg(`Recarga de ${formatCOP(amt)} aprobada con éxito`);
  };

  return (
    <div className="@container relative w-full h-full max-w-[960px] mx-auto bg-[#F8FAFC] flex flex-col overflow-hidden border-x border-slate-200">
      {/* Sticky App Header */}
      <header className="shrink-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 pt-4 pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('mapa')}
            aria-label="Volver al mapa"
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-headline text-base @[420px]:text-lg font-bold text-slate-900 truncate">
              Billetera & Ticket Digital
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              Red Metropolitana Barranquilla · Tarifa $3.100 COP
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAllTx(true);
            txSectionRef.current?.scrollIntoView({behavior: 'smooth'});
            setToastMsg(`Mostrando ${transactions.length} movimientos recientes`);
          }}
          aria-label="Historial de comprobantes"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
        >
          <Receipt className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable Main Content */}
      <main
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-24"
      >
        <div className="space-y-4 @[640px]:space-y-0 @[640px]:grid @[640px]:grid-cols-12 @[640px]:gap-5 items-start">
          {/* Dynamic QR Ticket Card */}
          <section
            aria-label="Ticket Digital Dinámico"
            className="@[640px]:col-span-5 relative bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[22px] p-4 @[420px]:p-5 shadow-xl overflow-hidden border border-slate-700"
          >
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#0D9488]/20 rounded-full blur-2xl pointer-events-none" />

            {/* Ticket Header Status */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-[#0D9488] text-white font-mono text-[11px] font-bold shrink-0">
                  QR DINÁMICO
                </span>
                <span className="text-xs text-white/80 truncate">1 pasaje</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Listo</span>
              </div>
            </div>

            {/* Dynamic SVG QR Code */}
            <div className="my-4 flex flex-col items-center">
              <button
                type="button"
                onClick={handleRefreshQr}
                aria-label="Tocar para regenerar código QR"
                className="p-3 bg-white rounded-xl shadow-inner flex flex-col items-center hover:ring-2 hover:ring-[#14B8A6] transition-all cursor-pointer"
              >
                <svg
                  className="w-40 h-40 @[420px]:w-44 @[420px]:h-44"
                  viewBox="0 0 120 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Finder Squares */}
                  <rect x="5" y="5" width="30" height="30" rx="4" fill="#0F172A" />
                  <rect x="10" y="10" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="15" y="15" width="10" height="10" rx="1" fill="#0D9488" />

                  <rect x="85" y="5" width="30" height="30" rx="4" fill="#0F172A" />
                  <rect x="90" y="10" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="95" y="15" width="10" height="10" rx="1" fill="#0D9488" />

                  <rect x="5" y="85" width="30" height="30" rx="4" fill="#0F172A" />
                  <rect x="10" y="90" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="15" y="95" width="10" height="10" rx="1" fill="#0D9488" />

                  {/* Seed-responsive Data Modules */}
                  {QR_DATA_CELLS.map((cell, idx) => {
                    const useTeal = cell.accent
                      ? (idx + qrSeed) % 2 === 1
                      : (idx + qrSeed) % 5 === 0;
                    const visible = (idx + qrSeed) % 9 !== 0 || cell.accent;
                    if (!visible) return null;
                    return (
                      <rect
                        key={`${cell.x}-${cell.y}-${idx}`}
                        x={cell.x}
                        y={cell.y}
                        width={cell.w}
                        height={cell.h}
                        rx={1}
                        fill={useTeal ? '#0D9488' : '#0F172A'}
                      />
                    );
                  })}
                </svg>
                <span className="font-mono text-[11px] text-slate-600 tracking-widest mt-1.5 font-semibold">
                  {ticketCode}
                </span>
              </button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/90">
                <button
                  type="button"
                  onClick={handleRefreshQr}
                  className="min-h-[32px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-teal-300 font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar QR</span>
                </button>
                <span className="text-white/80">
                  Expira:{' '}
                  <strong className="font-mono text-emerald-400 tabular-nums">
                    {formattedTimer}
                  </strong>
                </span>
              </div>
            </div>

            {/* NFC Toggle Row */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-white/80 min-w-0">
                <Nfc className="w-4 h-4 text-[#14B8A6] shrink-0" />
                <span className="truncate">Pago por Contacto NFC</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNfcEnabled((v) => {
                    const next = !v;
                    setToastMsg(
                      next
                        ? 'Antena NFC lista: acerca tu dispositivo al validador'
                        : 'Pago NFC pausado temporalmente'
                    );
                    return next;
                  });
                }}
                className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold active:scale-95 transition-all shrink-0 ${
                  nfcEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {nfcEnabled ? 'HABILITADO' : 'PAUSADO'}
              </button>
            </div>
          </section>

          {/* Right Column on Tablet/Desktop / Stacked on Mobile */}
          <div className="@[640px]:col-span-7 space-y-4">
            {/* Digital Wallet Balance Card */}
            <section
              aria-label="Saldo y Billetera Digital"
              className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs text-slate-500 font-medium">Saldo Disponible</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-headline text-2xl text-slate-900 tracking-tight font-bold tabular-nums">
                      {formatCOP(balance)}
                    </span>
                    <span className="font-mono text-xs text-slate-500 font-bold">COP</span>
                  </div>
                  <p className="text-xs text-emerald-700 flex items-center gap-1 mt-0.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Rinde para {tripsCount} pasajes completos</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(true)}
                  className="min-h-[44px] px-3.5 py-2.5 bg-[#0D9488] text-white text-xs font-semibold rounded-[10px] hover:bg-teal-700 shadow-sm flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Recargar</span>
                </button>
              </div>

              {/* Quick Top Up Presets */}
              <div className="pt-2.5 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">
                  Recarga rápida en Colombia:
                </span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handlePresetTopUp(amt)}
                      className="min-h-[40px] py-1.5 px-1.5 rounded-[10px] border border-slate-300 bg-white text-slate-900 font-mono text-xs font-semibold hover:border-[#0D9488] hover:bg-teal-50 active:scale-95 transition-all tabular-nums whitespace-nowrap"
                    >
                      +{formatCOP(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Payment Method */}
              <div className="pt-2.5 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Método predeterminado</span>
                  <button
                    type="button"
                    onClick={() => setShowMethodModal(true)}
                    className="min-h-[32px] px-1 flex items-center text-[#0D9488] hover:underline font-semibold"
                  >
                    Cambiar
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMethodModal(true)}
                  className="w-full text-left flex items-center justify-between p-3 rounded-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded ${activeMethod.color} text-white flex items-center justify-center font-bold font-headline text-xs shrink-0`}
                    >
                      {activeMethod.badge}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {activeMethod.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 truncate">
                        {activeMethod.detail}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0" />
                </button>
              </div>
            </section>

            {/* Recent Transactions List */}
            <section
              ref={txSectionRef}
              id="txListSection"
              aria-label="Historial de Movimientos"
              className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline text-base text-slate-900 font-bold">
                  Últimos Movimientos
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAllTx((v) => !v)}
                  className="min-h-[32px] flex items-center text-xs text-[#0D9488] font-semibold hover:underline"
                >
                  {showAllTx ? 'Ver menos' : `Ver todos (${transactions.length})`}
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5">
                {[
                  {id: 'all', label: 'Todos'},
                  {id: 'trip', label: 'Viajes'},
                  {id: 'topup', label: 'Recargas'},
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTxFilter(tab.id as 'all' | 'trip' | 'topup')}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      txFilter === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-slate-200">
                {visibleTransactions.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">
                    No hay movimientos registrados en esta categoría.
                  </p>
                ) : (
                  visibleTransactions.map((tx) => {
                    const isTopup = tx.type === 'topup';
                    const isTrip = tx.type === 'trip';
                    return (
                      <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isTrip
                                ? 'bg-blue-50 text-[#2563EB]'
                                : isTopup
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isTrip ? (
                              <Bus className="w-4 h-4" />
                            ) : isTopup ? (
                              <CreditCard className="w-4 h-4" />
                            ) : (
                              <ArrowLeftRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {tx.title}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500 truncate">
                              {tx.subtitle}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-mono text-[13px] font-bold tabular-nums shrink-0 ${
                            tx.amountCop > 0
                              ? 'text-emerald-600'
                              : tx.amountCop < 0
                              ? 'text-slate-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {tx.amountCop > 0
                            ? `+${formatCOP(tx.amountCop)}`
                            : tx.amountCop < 0
                            ? `-${formatCOP(tx.amountCop)}`
                            : '$0 COP'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Bottom App Shell Navigation Bar (anchored inside frame) */}
      <nav
        aria-label="Navegación principal"
        className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 pt-2 pb-3 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
      >
        <ul className="flex items-center justify-around max-w-lg mx-auto">
          <li>
            <button
              type="button"
              onClick={() => onNavigate('mapa')}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <Compass className="w-5 h-5" />
              <span className="text-[11px]">Explorar</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate('rutas')}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <Route className="w-5 h-5" />
              <span className="text-[11px]">Rutas</span>
            </button>
          </li>
          <li className="-mt-5">
            <button
              type="button"
              onClick={handleRefreshQr}
              aria-label="Actualizar Ticket QR"
              className="w-14 h-14 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              <QrCode className="w-7 h-7" />
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-current="page"
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[#0D9488] font-medium px-3"
            >
              <Wallet className="w-5 h-5" />
              <span className="text-[11px]">Billetera</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 px-3"
            >
              <User className="w-5 h-5" />
              <span className="text-[11px]">Perfil</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Top Up Confirmation Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <form
            onSubmit={handleConfirmCustomTopUp}
            className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900">
                    Recargar Billetera
                  </h3>
                  <p className="text-xs text-slate-500">Pago seguro vía Nequi / PSE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-slate-900 font-medium">Monto a Recargar (COP)</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    step={5000}
                    min={5000}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-[10px] font-mono text-base font-bold text-slate-900"
                  />
                </div>
              </label>
              <div className="p-3 rounded-[10px] bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Comisión de transacción:</span>
                  <span className="font-mono text-emerald-600 font-bold">$0 COP</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Método:</span>
                  <span className="font-semibold text-slate-700">
                    {activeMethod.name} ({activeMethod.detail})
                  </span>
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-[48px] rounded-[10px] bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>Aprobar Recarga Inmediata</span>
            </button>
          </form>
        </div>
      )}

      {/* Payment Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-headline text-base font-bold text-slate-900">
                Seleccionar Método de Pago
              </h3>
              <button
                type="button"
                onClick={() => setShowMethodModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((method, idx) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethodIdx(idx);
                    setShowMethodModal(false);
                    setToastMsg(`Método actualizado a ${method.name}`);
                  }}
                  className={`w-full text-left p-3 rounded-lg border flex items-center justify-between transition-colors ${
                    selectedMethodIdx === idx
                      ? 'border-[#0D9488] bg-teal-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded ${method.color} text-white flex items-center justify-center font-bold font-headline text-xs`}
                    >
                      {method.badge}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">{method.detail}</p>
                    </div>
                  </div>
                  {selectedMethodIdx === idx && (
                    <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Passenger Profile & Roles Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900">
                    Pasajero Barranquilla
                  </h3>
                  <p className="font-mono text-[11px] text-slate-500">
                    Tarjeta Virtual BAQ • Activa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Saldo disponible</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCOP(balance)} COP ({tripsCount} pasajes)
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onNavigate('mapa');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Explorar Mapa en Vivo</p>
                    <p className="text-[11px] text-slate-500">Partida, destino y buses cercanos</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onNavigate('rutas');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Route className="w-5 h-5 text-[#0D9488]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Buscador de Rutas BAQ</p>
                    <p className="text-[11px] text-slate-500">Consultar rutas por zona del mapa</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onNavigate('conductor');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bus className="w-5 h-5 text-[#2563EB]" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">App Conductor (Tableta)</p>
                    <p className="text-[11px] text-slate-500">Validador QR y Conteo APC</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onNavigate('operador');
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-800 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Centro de Control (Operador)
                    </p>
                    <p className="text-[11px] text-slate-500">Telemetría de flota y recaudo</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification anchored inside screen */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 max-w-[90%] whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
