// @ts-nocheck -- cabeçalhos de planilhas são dinâmicos e validados em tempo de execução.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { AlertTriangle, Building2, CheckCircle2, Clock3, DollarSign, LoaderCircle, MapPin, Search, TrendingUp, Upload } from "lucide-react";
import type { JsonRecord, PersistedRecord } from "./types";
import { brl, coordinate, normalize, readWorkbook } from "./utils";

const colors: Record<string,string> = { "descoberto corumba":"#2563eb", "torto santa maria":"#16a34a", "sobradinho planaltina":"#9333ea", "paranoa norte":"#0891b2", "paranoa sul":"#f59e0b", brazlandia:"#dc2626" };
const colorFor = (value: unknown) => Object.entries(colors).find(([key]) => normalize(value).includes(key))?.[1] || "#64748b";
const field = (row: JsonRecord, ...names: string[]) => Object.entries(row).find(([key]) => names.some(name => normalize(key) === normalize(name)))?.[1];
const num = (value: unknown) => { if (value === null || value === undefined || String(value).trim() === "") return null; const parsed = Number(String(value).replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".").replace("%", "")); return Number.isFinite(parsed) ? parsed : null; };

function Markers({ rows }: { rows: JsonRecord[] }) {
  const map = useMap();
  useEffect(() => {
    const group = L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false });
    const bounds: [number,number][] = [];
    rows.forEach(row => {
      const lat = coordinate(field(row,"Latitude"),"lat"), lng = coordinate(field(row,"Longitude"),"lng"); if (lat === null || lng === null) return; bounds.push([lat,lng]);
      const progress = num(field(row,"Execução Física","Execucao Fisica","Execução Financeira")); const color = progress === null ? "#64748b" : progress >= 80 ? "#10b981" : progress >= 40 ? "#f59e0b" : "#2563eb";
      const marker = L.circleMarker([lat,lng], { radius:8, color:"white", weight:3, fillColor:color, fillOpacity:1 });
      marker.bindPopup(`<strong>Obra ${String(field(row,"Item") || "")}</strong><br>${String(field(row,"Objeto Contrato") || "Objeto não informado")}<br><small>${String(field(row,"Local") || "Local não informado")} · ${String(field(row,"Situação") || "Situação não informada")}</small>`); group.addLayer(marker);
    });
    map.addLayer(group); map.invalidateSize(); if (bounds.length) map.fitBounds(bounds, { padding:[30,30], maxZoom:13 });
    return () => { map.removeLayer(group); group.clearLayers(); };
  }, [map,rows]);
  return null;
}

function Card({ label,value,accent="text-blue-700",icon:Icon=Building2 }: {label:string;value:React.ReactNode;accent?:string;icon?:React.ElementType}) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon size={16}/></span></div><p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p></div>;
}

export function ObrasView() {
  const [items,setItems]=useState<PersistedRecord[]>([]); const [polygons,setPolygons]=useState<any>(null); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [query,setQuery]=useState(""); const input=useRef<HTMLInputElement>(null);
  const load=useCallback(async()=>{ const response=await fetch("/api/fiscalizacao-mapas/obras"); const payload=await response.json(); if(!response.ok||!payload.success) throw new Error(payload.error); setItems(payload.data); },[]);
  useEffect(()=>{load().catch(error=>setMessage(error.message)); fetch("/data/sistemas-ai.geojson").then(response=>response.json()).then(setPolygons).catch(()=>null);},[load]);
  const rows=useMemo(()=>items.map(item=>item.data),[items]); const filtered=useMemo(()=>rows.filter(row=>!query||normalize(Object.values(row).join(" ")).includes(normalize(query))),[query,rows]);
  const stats=useMemo(()=>{ const status=(needle:string)=>filtered.filter(row=>normalize(field(row,"Situação")).includes(needle)).length; const progress=filtered.map(row=>num(field(row,"Execução Física","Execução Financeira"))).filter((value):value is number=>value!==null); return { execution:status("execucao"), receipt:status("recebimento"), noCoords:filtered.filter(row=>coordinate(field(row,"Latitude"),"lat")===null||coordinate(field(row,"Longitude"),"lng")===null).length, average:progress.length?progress.reduce((a,b)=>a+b,0)/progress.length:0, total:filtered.reduce((sum,row)=>sum+(num(field(row,"Valor Total"))||0),0), executed:filtered.reduce((sum,row)=>sum+(num(field(row,"Executado 2025"))||0),0) };},[filtered]);
  const byStatus=Object.entries(filtered.reduce<Record<string,number>>((result,row)=>{const key=String(field(row,"Situação")||"Outras");result[key]=(result[key]||0)+1;return result;},{})).sort((a,b)=>b[1]-a[1]);
  const importFile=async(file?:File)=>{if(!file)return;setBusy(true);setMessage("");try{const book=await readWorkbook(file);const records=Object.values(book)[0]||[];if(!records.length)throw new Error("O arquivo não possui obras.");const response=await fetch("/api/fiscalizacao-mapas/obras",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({records})});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.error);await load();setMessage(`${records.length} obras importadas com todos os campos do arquivo.`);}catch(error){setMessage(error instanceof Error?error.message:"Falha na importação.");}finally{setBusy(false);if(input.current)input.current.value="";}};

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Card label="Total de obras" value={filtered.length}/><Card label="Em execução" value={stats.execution} accent="text-amber-700" icon={Clock3}/><Card label="Em recebimento" value={stats.receipt} accent="text-emerald-700" icon={CheckCircle2}/><Card label="Sem coordenadas" value={stats.noCoords} accent="text-amber-700" icon={AlertTriangle}/><Card label="Execução média" value={`${stats.average.toFixed(0)}%`} icon={TrendingUp}/><Card label="Valor total" value={brl(stats.total)} accent="text-slate-800" icon={DollarSign}/><Card label="Executado em 2025" value={brl(stats.executed)} icon={DollarSign}/></div>
    <div className="flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm"><input ref={input} type="file" accept=".csv,.xlsx,.xls,.xlsm" className="hidden" onChange={event=>importFile(event.target.files?.[0])}/><label className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Contrato, fornecedor, sistema, local ou situação" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"/></label><button disabled={busy} onClick={()=>input.current?.click()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">{busy?<LoaderCircle className="mr-1 inline animate-spin" size={16}/>:<Upload className="mr-1 inline" size={16}/>}Importar CSV</button>{message&&<p className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-800">{message}</p>}</div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]"><section><h3 className="mb-3 flex items-center gap-2 font-black text-slate-800"><MapPin className="text-blue-600" size={18}/>Mapa de obras e sistemas</h3><div className="h-[540px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm"><MapContainer center={[-15.79,-47.88]} zoom={9} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{polygons&&<Pane name="obras-polygons" style={{zIndex:390}}><GeoJSON data={polygons} style={feature=>{const color=colorFor(feature?.properties?.sistema);return{color,weight:1.5,fillColor:color,fillOpacity:.12};}}/></Pane>}<Markers rows={filtered}/></MapContainer></div></section><section className="mt-8 h-[540px] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-black text-slate-800">Situação dos contratos</h3><p className="mb-5 text-xs text-slate-500">Distribuição dos {filtered.length} registros</p><div className="space-y-4">{byStatus.map(([name,value],index)=><div key={name}><div className="mb-1.5 flex justify-between text-xs text-slate-600"><span>{name}</span><b>{value}</b></div><div className="h-2.5 rounded-full bg-slate-100"><div className={`h-2.5 rounded-full ${index===0?"bg-blue-600":index===1?"bg-sky-500":"bg-blue-300"}`} style={{width:`${value/Math.max(1,byStatus[0]?.[1]||1)*100}%`}}/></div></div>)}</div></section></div>
  </div>;
}
