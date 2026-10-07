import React from 'react';
import { Globe, Lock, Share2, Check, Copy, Shield, Sparkles } from 'lucide-react';
import { usePanelAccess, getPanelPublicUrl } from '../lib/panelAccess';

interface PanelAccessBadgeProps {
  panelId: string;
  panelName: string;
  showToggle?: boolean;
  showShare?: boolean;
  variant?: 'badge' | 'button' | 'header' | 'card-tag';
  theme?: 'light' | 'dark';
  showToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  className?: string;
}

export const PanelAccessBadge: React.FC<PanelAccessBadgeProps> = ({
  panelId,
  panelName,
  showToggle = true,
  showShare = true,
  variant = 'badge',
  theme = 'light',
  showToast,
  className = '',
}) => {
  const { checkIsPublic, toggleAccess } = usePanelAccess();
  const [copied, setCopied] = React.useState(false);

  const isPublic = checkIsPublic(panelId);
  const publicUrl = getPanelPublicUrl(panelId);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = toggleAccess(panelId);
    if (showToast) {
      if (nextState) {
        showToast(
          'Painel Tornado Público',
          `"${panelName}" agora está acessível publicamente pelo link externo.`,
          'success'
        );
      } else {
        showToast(
          'Painel Tornado Privado',
          `"${panelName}" agora é restrito à área interna autenticada.`,
          'info'
        );
      }
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (showToast) {
        showToast(
          'Link Público Copiado!',
          `O link público de "${panelName}" (${publicUrl}) foi copiado.`,
          'success'
        );
      }
    }).catch(() => {
      prompt('Copie o link público:', publicUrl);
    });
  };

  if (variant === 'header') {
    const isDark = theme === 'dark';
    const tooltipText = isPublic
      ? 'Nível de Privacidade: Público • Clique para tornar este painel Privado'
      : 'Nível de Privacidade: Privado • Clique para tornar este painel Público';

    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {/* Toggle Access Button in Header (Icon only) */}
        {showToggle ? (
          <button
            type="button"
            onClick={handleToggle}
            className={`inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all duration-200 border cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? isPublic
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30 shadow-emerald-500/20'
                  : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/20'
                : isPublic
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400'
            }`}
            title={tooltipText}
            aria-label={tooltipText}
          >
            {isPublic ? (
              <Globe size={16} className={isDark ? "text-emerald-300 animate-pulse" : "text-emerald-600 animate-pulse"} />
            ) : (
              <Lock size={16} className={isDark ? "text-slate-300" : "text-slate-600"} />
            )}
          </button>
        ) : (
          <div
            className={`inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl border ${
              isDark
                ? isPublic
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-white/10 text-slate-300 border-white/20'
                : isPublic
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={isPublic ? 'Nível de Privacidade: Público' : 'Nível de Privacidade: Privado'}
          >
            {isPublic ? (
              <Globe size={16} className={isDark ? "text-emerald-300 animate-pulse" : "text-emerald-600 animate-pulse"} />
            ) : (
              <Lock size={16} className={isDark ? "text-slate-300" : "text-slate-600"} />
            )}
          </div>
        )}

        {/* Share Button (if public) - Icon only */}
        {isPublic && showShare && (
          <button
            type="button"
            onClick={handleCopyLink}
            className={`inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border-blue-400/30'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
            }`}
            title={copied ? 'Link público copiado com sucesso!' : `Copiar link público (${publicUrl})`}
            aria-label={copied ? 'Link público copiado com sucesso!' : `Copiar link público (${publicUrl})`}
          >
            {copied ? (
              <Check size={16} className="text-emerald-500" />
            ) : (
              <Share2 size={16} className={isDark ? "text-blue-300" : "text-blue-600"} />
            )}
          </button>
        )}
      </div>
    );
  }

  if (variant === 'card-tag') {
    const isDark = theme === 'dark';
    const tooltipText = isPublic
      ? 'Nível de Privacidade: Público • Clique para tornar Privado'
      : 'Nível de Privacidade: Privado • Clique para tornar Público';

    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={showToggle ? handleToggle : undefined}
          className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
            showToggle ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
          } ${
            isDark
              ? isPublic
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/35 shadow-xs shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60'
              : isPublic
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-xs'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700'
          }`}
          title={tooltipText}
          aria-label={tooltipText}
        >
          {isPublic ? (
            <Globe size={15} className={isDark ? "text-emerald-300 animate-pulse" : "text-emerald-600 animate-pulse"} />
          ) : (
            <Lock size={15} className={isDark ? "text-slate-300" : "text-slate-500"} />
          )}
        </button>

        {isPublic && showShare && (
          <button
            type="button"
            onClick={handleCopyLink}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'text-blue-300 bg-blue-500/10 border-blue-400/20 hover:text-white hover:bg-blue-500/25'
                : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'
            }`}
            title="Copiar Link Público Oficial"
            aria-label="Copiar Link Público Oficial"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    );
  }

  // Default Badge Variant (Icon Only with Informative Tooltip)
  const tooltipText = isPublic
    ? 'Nível de Privacidade: Público • Clique para tornar Privado'
    : 'Nível de Privacidade: Privado • Clique para tornar Público';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={showToggle ? handleToggle : undefined}
        className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition-all ${
          showToggle ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
        } ${
          isPublic
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
        }`}
        title={tooltipText}
        aria-label={tooltipText}
      >
        {isPublic ? <Globe size={14} className="text-emerald-600 animate-pulse" /> : <Lock size={14} className="text-slate-500" />}
      </button>
    </div>
  );
};
