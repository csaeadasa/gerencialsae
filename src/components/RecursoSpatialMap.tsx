import React, { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Droplets, Waves, Sparkles, Maximize2, RotateCcw, Filter, Eye } from "lucide-react";
import { Task } from "../types";

// Centroids for all Administrative Regions (RAs) of Distrito Federal
const RA_COORDINATES: Record<string, [number, number]> = {
  "Brasília": [-15.7939, -47.8828],
  "Brasília (RA I)": [-15.7939, -47.8828],
  "Plano Piloto": [-15.7939, -47.8828],
  "Gama": [-16.0175, -48.0647],
  "Gama (RA II)": [-16.0175, -48.0647],
  "Taguatinga": [-15.8333, -48.0567],
  "Taguatinga (RA III)": [-15.8333, -48.0567],
  "Brazlândia": [-15.6719, -48.2003],
  "Brazlândia (RA IV)": [-15.6719, -48.2003],
  "Sobradinho": [-15.6531, -47.7944],
  "Sobradinho (RA V)": [-15.6531, -47.7944],
  "Planaltina": [-15.6208, -47.6533],
  "Planaltina (RA VI)": [-15.6208, -47.6533],
  "Paranoá": [-15.7725, -47.7775],
  "Paranoá (RA VII)": [-15.7725, -47.7775],
  "Núcleo Bandeirante": [-15.8672, -47.9681],
  "Núcleo Bandeirante (RA VIII)": [-15.8672, -47.9681],
  "Ceilândia": [-15.8194, -48.1136],
  "Ceilândia (RA IX)": [-15.8194, -48.1136],
  "Guará": [-15.8278, -47.9806],
  "Guará (RA X)": [-15.8278, -47.9806],
  "Cruzeiro": [-15.7944, -47.9361],
  "Cruzeiro (RA XI)": [-15.7944, -47.9361],
  "Samambaia": [-15.8778, -48.0872],
  "Samambaia (RA XII)": [-15.8778, -48.0872],
  "Santa Maria": [-16.0194, -47.9944],
  "Santa Maria (RA XIII)": [-16.0194, -47.9944],
  "São Sebastião": [-15.9083, -47.7708],
  "São Sebastião (RA XIV)": [-15.9083, -47.7708],
  "Recanto das Emas": [-15.9042, -48.0708],
  "Recanto das Emas (RA XV)": [-15.9042, -48.0708],
  "Lago Sul": [-15.8458, -47.8722],
  "Lago Sul (RA XVI)": [-15.8458, -47.8722],
  "Riacho Fundo": [-15.8819, -48.0167],
  "Riacho Fundo (RA XVII)": [-15.8819, -48.0167],
  "Lago Norte": [-15.7333, -47.8444],
  "Lago Norte (RA XVIII)": [-15.7333, -47.8444],
  "Candangolândia": [-15.8500, -47.9500],
  "Candangolândia (RA XIX)": [-15.8500, -47.9500],
  "Águas Claras": [-15.8389, -48.0306],
  "Águas Claras (RA XX)": [-15.8389, -48.0306],
  "Riacho Fundo II": [-15.8972, -48.0417],
  "Riacho Fundo II (RA XXI)": [-15.8972, -48.0417],
  "Sudoeste/Octogonal": [-15.8000, -47.9278],
  "Sudoeste/Octogonal (RA XXII)": [-15.8000, -47.9278],
  "Varjão": [-15.7167, -47.8750],
  "Varjão (RA XXIII)": [-15.7167, -47.8750],
  "Park Way": [-15.8917, -47.9583],
  "Park Way (RA XXIV)": [-15.8917, -47.9583],
  "SCIA/Estrutural": [-15.7861, -47.9889],
  "SCIA/Estrutural (RA XXV)": [-15.7861, -47.9889],
  "Sobradinho II": [-15.6333, -47.8167],
  "Sobradinho II (RA XXVI)": [-15.6333, -47.8167],
  "Jardim Botânico": [-15.8833, -47.8167],
  "Jardim Botânico (RA XXVII)": [-15.8833, -47.8167],
  "Itapoã": [-15.7486, -47.7750],
  "Itapoã (RA XXVIII)": [-15.7486, -47.7750],
  "SIA": [-15.8167, -47.9500],
  "SIA (RA XXIX)": [-15.8167, -47.9500],
  "Vicente Pires": [-15.8056, -48.0278],
  "Vicente Pires (RA XXX)": [-15.8056, -48.0278],
  "Fercal": [-15.5833, -47.8833],
  "Fercal (RA XXXI)": [-15.5833, -47.8833],
  "Sol Nascente/Pôr do Sol": [-15.8236, -48.1403],
  "Arniqueira": [-15.8583, -48.0194],
  "Arapoanga": [-15.6028, -47.6694],
  "Água Quente": [-15.9861, -48.1750]
};

// Deterministic pseudo-random jitter based on string/number seed
function getDeterministicOffset(seed: number | string, spread = 0.022): [number, number] {
  const str = String(seed);
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    hash1 = (hash1 * 31 + str.charCodeAt(i)) % 100000;
    hash2 = (hash2 * 37 + str.charCodeAt(i) + 13) % 100000;
  }
  const norm1 = (hash1 / 100000) * 2 - 1; // [-1, 1]
  const norm2 = (hash2 / 100000) * 2 - 1; // [-1, 1]
  return [norm1 * spread, norm2 * spread];
}

interface RecursoSpatialMapProps {
  tasks: Task[];
  activeTab: 'ouvidoria' | 'recurso_revisao';
  onSelectTask?: (taskId: number) => void;
}

export interface MapPointItem {
  id: number;
  task: Task;
  lat: number;
  lng: number;
  servico: 'Água' | 'Esgoto' | string;
  isRealCoordinate: boolean;
  numeroSei: string;
  recorrente: string;
  regiaoAdministrativa: string;
  irregularidade: string;
  tipoInfracao: string;
  situacao: string;
  resultado: string;
  etapa: string;
  classificacaoImovel: string;
  valorMultaQuestionada?: string | number;
  valorMultaMantida?: string | number;
}

// Subcomponent to adjust view on filter or points change
function MapViewHandler({ bounds }: { bounds: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 12);
      } else {
        map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [bounds, map]);
  return null;
}

export function RecursoSpatialMap({ tasks, activeTab, onSelectTask }: RecursoSpatialMapProps) {
  const [serviceFilter, setServiceFilter] = useState<'all' | 'Água' | 'Esgoto'>('all');
  const [selectedPoint, setSelectedPoint] = useState<MapPointItem | null>(null);

  // Convert tasks to spatial points
  const points: MapPointItem[] = useMemo(() => {
    return tasks.map((t) => {
      const rev = t.recursoRevData;
      const ouv = t.ouvidoriaData || t.recursoData;
      
      const servicoRaw = rev?.servico || ouv?.servico || "Água";
      const isEsgoto = servicoRaw.toLowerCase().includes("esgoto");
      const servico = isEsgoto ? "Esgoto" : "Água";

      const rawLat = rev?.latitude || (t as any).latitude;
      const rawLng = rev?.longitude || (t as any).longitude;

      let lat: number | null = null;
      let lng: number | null = null;
      let isRealCoordinate = false;

      if (rawLat && rawLng) {
        const pLat = parseFloat(String(rawLat).replace(",", "."));
        const pLng = parseFloat(String(rawLng).replace(",", "."));
        if (!isNaN(pLat) && !isNaN(pLng) && pLat < -14 && pLat > -17 && pLng < -49 && pLng > -46) {
          lat = pLat;
          lng = pLng;
          isRealCoordinate = true;
        }
      }

      const ra = (rev?.regiaoAdministrativa || ouv?.regiaoAdministrativa || "Brasília").trim();

      if (lat === null || lng === null) {
        // Find RA coordinates
        let baseCoords: [number, number] = [-15.7939, -47.8828]; // Default Brasília
        for (const [key, coords] of Object.entries(RA_COORDINATES)) {
          if (ra.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(ra.toLowerCase())) {
            baseCoords = coords;
            break;
          }
        }
        const [jitterLat, jitterLng] = getDeterministicOffset(t.id + (rev?.numeroSei || ""), 0.015);
        lat = baseCoords[0] + jitterLat;
        lng = baseCoords[1] + jitterLng;
      }

      const numeroSei = rev?.numeroSei || rev?.numeroProcesso || ouv?.numeroSei || t.seiProcess || `REV-${t.id}`;
      const recorrente = rev?.recorrente || ouv?.nomeUsuario || t.assignedTo || "Recorrente Não Informado";
      const regiaoAdministrativa = rev?.regiaoAdministrativa || ouv?.regiaoAdministrativa || "Distrito Federal";
      const irregularidade = rev?.irregularidadeEncontrada || rev?.irregularidade || ouv?.apuracao || ouv?.categoria || "Não informada";
      const tipoInfracao = rev?.tipoInfracao || ouv?.categoria || "Infração Regulatória";
      const situacao = rev?.situacao || ouv?.situacao || "Recebido";
      const resultado = rev?.resultado || ouv?.resultadoProcesso || "Em Análise";
      const classificacaoImovel = rev?.classificacaoImovel || ouv?.classificacaoImovel || "Residencial";

      return {
        id: t.id,
        task: t,
        lat,
        lng,
        servico,
        isRealCoordinate,
        numeroSei,
        recorrente,
        regiaoAdministrativa,
        irregularidade,
        tipoInfracao,
        situacao,
        resultado,
        etapa: situacao,
        classificacaoImovel,
        valorMultaQuestionada: rev?.valorMultaQuestionada,
        valorMultaMantida: rev?.valorMultaMantida
      };
    });
  }, [tasks]);

  // Filtered points by service selection
  const filteredPoints = useMemo(() => {
    if (serviceFilter === 'all') return points;
    return points.filter(p => p.servico === serviceFilter);
  }, [points, serviceFilter]);

  // Point counts
  const countAgua = useMemo(() => points.filter(p => p.servico === 'Água').length, [points]);
  const countEsgoto = useMemo(() => points.filter(p => p.servico === 'Esgoto').length, [points]);

  // Spatial bounds of current filtered points
  const mapBounds = useMemo<[number, number][] | null>(() => {
    if (filteredPoints.length === 0) return null;
    return filteredPoints.map(p => [p.lat, p.lng]);
  }, [filteredPoints]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm text-left my-6 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-[#1A3E8A]">
              <MapPin size={18} className="stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                MAPA DE RESULTADO DAS ANÁLISES POR TIPO DE SERVIÇO
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {activeTab === 'ouvidoria'
                  ? "Distribuição espacial das demandas de ouvidoria"
                  : "Distribuição espacial dos recursos de revisão georreferenciados no Distrito Federal"}
              </p>
            </div>
          </div>
        </div>

        {/* Legend & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Service Filters */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setServiceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                serviceFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos ({points.length})
            </button>
            <button
              type="button"
              onClick={() => setServiceFilter('Água')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                serviceFilter === 'Água'
                  ? 'bg-[#1A3E8A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block border border-white" />
              Água ({countAgua})
            </button>
            <button
              type="button"
              onClick={() => setServiceFilter('Esgoto')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                serviceFilter === 'Esgoto'
                  ? 'bg-[#881337] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] inline-block border border-white" />
              Esgoto ({countEsgoto})
            </button>
          </div>
        </div>
      </div>

      {/* Map Container & Interactive View */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-50">
        <MapContainer
          center={[-15.7939, -47.8828]}
          zoom={10.5}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 10 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewHandler bounds={mapBounds} />

          {filteredPoints.map((item) => {
            const isAgua = item.servico === "Água";
            // Distinctive visual styling: Água = Blue/Navy, Esgoto = Maroon/Burgundy
            const fillColor = isAgua ? "#1A3E8A" : "#881337";
            const borderColor = isAgua ? "#38bdf8" : "#f43f5e";

            return (
              <CircleMarker
                key={item.id}
                center={[item.lat, item.lng]}
                radius={5.5}
                pathOptions={{
                  fillColor,
                  fillOpacity: 0.88,
                  color: borderColor,
                  weight: 1.5
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedPoint(item);
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.96}>
                  <div className="text-[11px] leading-tight font-sans p-1">
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: fillColor }}
                      />
                      {item.numeroSei}
                    </div>
                    <div className="text-slate-600 font-semibold mt-0.5">
                      {item.regiaoAdministrativa} • {item.servico}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                      {item.irregularidade}
                    </div>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="p-2 min-w-[220px] max-w-[280px] text-left font-sans">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Processo SEI
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          isAgua
                            ? "bg-blue-50 text-[#1A3E8A] border border-blue-200"
                            : "bg-rose-50 text-[#881337] border border-rose-200"
                        }`}
                      >
                        {item.servico}
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="text-xs font-black text-slate-900">{item.numeroSei}</div>
                      <div className="text-[11px] font-semibold text-slate-700">{item.recorrente}</div>
                    </div>

                    <div className="space-y-1.5 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-700">Região:</span> {item.regiaoAdministrativa}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Classificação:</span> {item.classificacaoImovel}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Infração:</span> {item.tipoInfracao}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Irregularidade:</span> {item.irregularidade}
                      </div>
                      <div className="pt-1 border-t border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-700">Situação:</span>
                        <span className="font-extrabold text-blue-700">{item.resultado}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Floating Legend / Service Card on Top Right */}
        <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-slate-200/90 text-left min-w-[200px]">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Legenda por Serviço</span>
            <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {filteredPoints.length} pontos
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#1A3E8A] border-2 border-[#38bdf8] shadow-xs" />
                <span className="font-bold text-slate-700">Água</span>
              </div>
              <span className="font-extrabold text-[#1A3E8A] text-xs">{countAgua}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#881337] border-2 border-[#f43f5e] shadow-xs" />
                <span className="font-bold text-slate-700">Esgoto</span>
              </div>
              <span className="font-extrabold text-[#881337] text-xs">{countEsgoto}</span>
            </div>
          </div>
        </div>

        {/* Floating Bottom Stats Pill */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200/90 flex items-center gap-3 text-left">
          <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-800">Distrito Federal:</span>
            <span>{filteredPoints.length} recursos posicionados no mapa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
