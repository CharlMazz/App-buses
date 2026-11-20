import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bus,
  CheckCircle2,
  CreditCard,
  Lock,
  PlusCircle,
  QrCode,
  Receipt,
  X,
} from 'lucide-react';
import {formatCOP} from '../data/barranquillaTransit';
import type {ScreenId, TripPlannerState, WalletTransaction} from '../types/transit';
import {PassengerBottomNav} from './PassengerBottomNav';

interface PassengerWalletScreenProps {
  balance: number;
  transactions: WalletTransaction[];
  tripPlanner: TripPlannerState;
  onTopUp: (amount: number, methodLabel: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

const PRESET_AMOUNTS = [10000, 20000, 50000];

const PAYMENT_METHODS = [
  {id: 'nequi', name: 'Nequi Colombia', detail: '300 ••• •452', badge: 'N', color: 'bg-[#1F0433]'},
  {id: 'pse', name: 'PSE Bancolombia', detail: 'Cuenta Ahorros •891', badge: 'P', color: 'bg-amber-500'},
  {id: 'card', name: 'Tarjeta Débito Visa', detail: '•••• 4821', badge: 'V', color: 'bg-blue-700'},
];

export function PassengerWalletScreen({
  balance,
  transactions,
  tripPlanner,
  onTopUp,
  onNavigate,
}: PassengerWalletScreenProps) {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const txSectionRef = useRef<HTMLElement | null>(null);

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [selectedMethodIdx, setSelectedMethodIdx] = useState(0);
  const [customAmount, setCustomAmount] = useState('20000');
  const [txFilter, setTxFilter] = useState<'all' | 'trip' | 'topup'>('all');
  const [showAllTx, setShowAllTx] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2500);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const tripsCount = Math.floor(balance / 3100);
  const activeMethod = PAYMENT_METHODS[selectedMethodIdx];

  const visibleTransactions = useMemo(() => {
    const base =
      txFilter === 'all'
        ? transactions
        : transactions.filter((tx) => tx.type === txFilter);
    return showAllTx ? base : base.slice(0, 5);
  }, [transactions, txFilter, showAllTx]);

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
    <div className="@container relative w-full h-full bg-[#F8FAFC] flex flex-col overflow-hidden">
      {/* Sticky App Header */}
      <header className="shrink-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 pt-4 pb-3">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('rutas')}
              aria-label="Volver a rutas"
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-base sm:text-lg font-bold text-slate-900 truncate">
                Billetera & Pagos
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Saldo, recargas y métodos de pago · Tarifa $3.100 COP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('qr')}
              className="h-9 px-3 rounded-full bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAllTx(true);
                txSectionRef.current?.scrollIntoView({behavior: 'smooth'});
                setToastMsg(`Mostrando ${transactions.length} movimientos recientes`);
              }}
              aria-label="Historial de comprobantes"
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:scale-95 transition-all"
            >
              <Receipt className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-16"
      >
        <div className="max-w-6xl mx-auto w-full space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-6 items-start">
          {/* Left Column: Balance, Quick Top-Ups & Payment Methods */}
          <div className="md:col-span-5 space-y-4">
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
          </div>

          {/* Recent Transactions List */}
            <section
              ref={txSectionRef}
              id="txListSection"
              aria-label="Historial de Movimientos"
              className="md:col-span-7 bg-white rounded-[20px] p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3"
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
      </main>

      <PassengerBottomNav
        currentScreen="billetera"
        balance={balance}
        tripPlanner={tripPlanner}
        onNavigate={onNavigate}
        positionClass="relative shrink-0"
      />

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
