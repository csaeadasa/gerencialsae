/**
 * @license
 * Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { 
  AlertTriangle, 
  RotateCcw, 
  Home, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  RefreshCw,
  ShieldAlert
} from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
  resetKeys?: any[];
  onReset?: () => void;
  onGoHome?: () => void;
  showHomeButton?: boolean;
  isRoot?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  timestamp: string;
  copied: boolean;
  showDetails: boolean;
}

type BaseComponentClass = new (props: ErrorBoundaryProps) => {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;
  setState(
    state: Partial<ErrorBoundaryState> | ((prevState: ErrorBoundaryState) => Partial<ErrorBoundaryState>),
    callback?: () => void
  ): void;
  render(): ReactNode;
};

const BaseComponent = Component as unknown as BaseComponentClass;

export class ErrorBoundary extends BaseComponent {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      timestamp: "",
      copied: false,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const timestamp = new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium"
    });
    return { 
      hasError: true, 
      error,
      errorId,
      timestamp
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log estruturado no console para diagnóstico de desenvolvimento e observabilidade
    console.group(`%c[ErrorBoundary SAE/ADASA] Falha capturada (${this.props.sectionName || "Global"})`, "color: #ef4444; font-weight: bold;");
    console.error("Erro:", error);
    console.info("Component Stack:", errorInfo.componentStack);
    console.groupEnd();
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Se as chaves de reset mudaram (ex: usuário trocou de aba), reinicia o estado do Error Boundary
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasChanged = resetKeys.some((key, idx) => key !== prevProps.resetKeys?.[idx]);
      if (hasChanged) {
        this.handleReset();
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      timestamp: "",
      copied: false,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyDetails = () => {
    const { error, errorInfo, errorId, timestamp } = this.state;
    const { sectionName } = this.props;

    const report = [
      "==================================================",
      "   RELATÓRIO DE DIAGNÓSTICO DE ERRO - SAE / ADASA",
      "==================================================",
      `ID de Rastreamento : ${errorId}`,
      `Data e Horário    : ${timestamp}`,
      `Módulo Afetado    : ${sectionName || "Geral / Shell da Aplicação"}`,
      `URL Atual         : ${typeof window !== "undefined" ? window.location.href : "N/D"}`,
      `Navegador         : ${typeof navigator !== "undefined" ? navigator.userAgent : "N/D"}`,
      "--------------------------------------------------",
      "MENSAGEM DE ERRO:",
      error ? `${error.name}: ${error.message}` : "Erro desconhecido",
      "--------------------------------------------------",
      "PILHA DE CHAMADA (STACK TRACE):",
      error?.stack || "Sem stack trace disponível",
      "--------------------------------------------------",
      "HIERARQUIA DE COMPONENTES (REACT):",
      errorInfo?.componentStack ? errorInfo.componentStack.trim() : "Sem component stack",
      "=================================================="
    ].join("\n");

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(report).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 3500);
      }).catch(() => {
        this.fallbackCopy(report);
      });
    } else {
      this.fallbackCopy(report);
    }
  };

  fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3500);
    } catch (e) {
      console.warn("Não foi possível copiar automaticamente para a área de transferência", e);
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { 
      sectionName, 
      fallbackTitle, 
      fallbackMessage, 
      showHomeButton = true, 
      onGoHome,
      isRoot = false 
    } = this.props;
    const { error, errorInfo, errorId, timestamp, copied, showDetails } = this.state;

    return (
      <div className={`w-full flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 ${isRoot ? "min-h-screen bg-slate-900/90 text-slate-800" : "min-h-[420px]"}`}>
        <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden text-left transition-all">
          
          {/* Header com identidade visual e alerta amigável */}
          <div className="bg-gradient-to-r from-amber-50 via-slate-50 to-indigo-50/40 p-6 sm:p-7 border-b border-slate-100 flex items-start gap-4">
            <div className="p-3.5 bg-amber-100/90 text-amber-700 rounded-2xl border border-amber-200 shrink-0 shadow-xs">
              <AlertTriangle size={28} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                  Instabilidade Temporária
                </span>
                {sectionName && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    Módulo: {sectionName}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-850 tracking-tight leading-snug">
                {fallbackTitle || "Ops! Ocorreu uma falha inesperada ao carregar este conteúdo"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                {fallbackMessage || "Houve uma interrupção pontual no processamento ou exibição dos dados. Seus registros estão preservados no servidor. Você pode tentar recarregar este módulo ou voltar à tela inicial."}
              </p>
            </div>
          </div>

          {/* Corpo com Ações e Card de Diagnóstico */}
          <div className="p-6 sm:p-7 space-y-6">
            
            {/* Botões de Ação Imediata */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw size={15} />
                <span>Tentar Novamente</span>
              </button>

              {showHomeButton && onGoHome && (
                <button
                  type="button"
                  onClick={() => {
                    this.handleReset();
                    onGoHome();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Home size={15} className="text-slate-500" />
                  <span>Voltar ao Início</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                title="Recarregar a página completa do navegador"
              >
                <RefreshCw size={14} className="text-slate-400" />
                <span>Recarregar Página</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyDetails}
                className={`ml-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  copied 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                }`}
                title="Copiar relatório para enviar ao suporte técnico da SAE"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 font-bold">Copiado para o Suporte!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-slate-500" />
                    <span>Copiar Detalhes</span>
                  </>
                )}
              </button>
            </div>

            {/* Painel Informativo de Rastreamento */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <ShieldAlert size={16} className="text-indigo-600 shrink-0" />
                <span>Código de rastreamento:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800 text-[11px]">
                  {errorId || "ERR-N/D"}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Registrado em: {timestamp}
              </div>
            </div>

            {/* Seção Expansível de Detalhes Técnicos (para administradores / suporte) */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-100/90 text-left flex items-center justify-between gap-3 text-xs font-bold text-slate-700 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-slate-400" />
                  <span>Detalhes Técnicos do Erro (Suporte / TI)</span>
                </div>
                {showDetails ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {showDetails && (
                <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono space-y-3 overflow-x-auto max-h-64 custom-scrollbar">
                  <div>
                    <span className="text-rose-400 font-bold block mb-1">
                      {error?.name || "Error"}: {error?.message || "Sem mensagem"}
                    </span>
                    {error?.stack && (
                      <pre className="text-[11px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">
                        {error.stack}
                      </pre>
                    )}
                  </div>

                  {errorInfo?.componentStack && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-indigo-400 font-bold block mb-1 text-[11px]">Hierarquia React:</span>
                      <pre className="text-[10px] text-slate-500 whitespace-pre-wrap font-mono leading-normal">
                        {errorInfo.componentStack.trim()}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Rodapé sutil */}
          <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Superintendência de Apoio Estratégico (SAE / ADASA)</span>
            <span>Sistema Gerencial Integrado</span>
          </div>
        </div>
      </div>
    );
  }
}
