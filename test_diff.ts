import * as diff from "diff";
import { compareTables, RegulatoryTable } from "./src/lib/tableStructure";

const origTable: RegulatoryTable = {
  title: "Test",
  headers: ["#", "CAMPO", "DESCRIÇÃO"],
  rows: [
    ["1", "Protocolo", "Numérico"],
    ["2", "Serviço", "Texto"],
    ["3", "Descrição", "Texto"],
    ["4", "Tipo", "Texto"]
  ]
};

const proposedTable: RegulatoryTable = {
  title: "Test",
  headers: ["#", "CAMPO", "DESCRIÇÃO"],
  rows: [
    ["1", "Protocolo", "Texto"],
    ["3", "Descrição", "Texto"],
    ["Teste", "Teste", "Teste"],
    ["4", "Tipo", "Texto"]
  ]
};

const result = compareTables(origTable, proposedTable);
console.log(JSON.stringify(result.mergedRows, null, 2));
