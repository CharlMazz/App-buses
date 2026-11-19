import React, {useState} from 'react';
import {Download, MoreVertical, PlusSquare, Share, Smartphone, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
  showFallbackHint?: boolean;
  onAfterAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  showFallbackHint = false,
  onAfterAction,
}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState<'ios' | 'browser' | null>(null);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      onAfterAction?.();
      return;
    }
    if (isIOS) {
      setShowGuideModal('ios');
      return;
    }
    if (showFallbackHint) {
      setShowGuideModal('browser');
    }
  };

  const canRenderButton = isInstallable || isIOS || showFallbackHint;
  if (!canRenderButton) {
    return null;
  }

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="w-full text-left p-3 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-50 hover:border-[#0D9488] flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm">
                {isIOS ? 'Instalar en iPhone / iPad' : 'Instalar app en el celular'}
              </p>
              <p className="text-[11px] text-slate-600 truncate">
                {isInstallable
                  ? 'Acceso directo en pantalla de inicio sin navegador'
                  : isIOS
                  ? 'Agregar desde el menú Compartir de Safari'
                  : 'Ver pasos para instalar desde Chrome o Safari'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[#0D9488] text-white text-xs font-semibold shrink-0 flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            Instalar
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="flex items-center gap-1.5 rounded-lg bg-[#0D9488] hover:bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isIOS ? 'Instalar en iOS' : 'Instalar app'}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Instrucciones para instalar la aplicación"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        >
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-headline text-base font-bold text-slate-900">
                  {showGuideModal === 'ios'
                    ? 'Instalar en iPhone / iPad'
                    : 'Instalar desde el navegador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(null)}
                aria-label="Cerrar guía de instalación"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showGuideModal === 'ios' ? (
              <ol className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-[#0D9488] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="pt-0.5">
                    Abre esta app en <strong>Safari</strong> y toca el botón{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-900">
                      <Share className="w-3 h-3 text-[#0D9488]" /> Compartir
                    </span>{' '}
                    en la barra inferior.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-[#0D9488] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="pt-0.5">
                    Desliza hacia abajo y selecciona{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-900">
                      <PlusSquare className="w-3 h-3 text-[#0D9488]" /> Agregar a pantalla de inicio
                    </span>
                    .
                  </div>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-[#0D9488] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="pt-0.5">
                    Abre el enlace compartido (<strong>HTTPS</strong>) directamente en una pestaña de{' '}
                    <strong>Chrome</strong> (Android) o <strong>Safari</strong> (iPhone).
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-[#0D9488] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="pt-0.5">
                    En Android toca el menú{' '}
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-900">
                      <MoreVertical className="w-3 h-3" /> Instalar aplicación
                    </span>{' '}
                    (o el botón <strong>Instalar</strong> cuando aparezca). En iPhone usa{' '}
                    <strong>Compartir → Agregar a pantalla de inicio</strong>.
                  </div>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(null)}
              className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-semibold text-white transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
