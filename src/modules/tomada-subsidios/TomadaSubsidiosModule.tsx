import React from "react";
import { TomadaSubsidiosTab } from "../../components/TomadaSubsidiosTab";
import { ParticipacaoSocialDashboard } from "../../components/ParticipacaoSocialDashboard";

interface TomadaSubsidiosModuleProps {
  view: "cadastro" | "painel";
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  currentUser?: any;
  onTabChange?: (tab: string) => void;
}

export const TomadaSubsidiosModule: React.FC<TomadaSubsidiosModuleProps> = ({ view, showToast, currentUser, onTabChange }) => {
  return (
    <div className="tomada-subsidios-module-root w-full h-full">
      {view === "cadastro" ? (
        <React.Suspense fallback={<div className="flex justify-center p-12 text-slate-400">Carregando...</div>}>
          <TomadaSubsidiosTab showToast={showToast} currentUser={currentUser} />
        </React.Suspense>
      ) : (
        <React.Suspense fallback={<div className="flex justify-center p-12 text-slate-400">Carregando...</div>}>
          <ParticipacaoSocialDashboard showToast={showToast} currentUser={currentUser} onTabChange={onTabChange} />
        </React.Suspense>
      )}
    </div>
  );
};

