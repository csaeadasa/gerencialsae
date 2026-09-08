import * as diff from "diff";
import { compareTables, RegulatoryTable } from "./src/lib/tableStructure";

const origTable: RegulatoryTable = {
  title: "Test",
  headers: ["CAMPO", "DESCRIÇÃO", "FORMATO"],
  rows: [
    ["Protocolo", "Numérico", "1"],
    ["Serviço", "Texto", "2"],
    ["Descrição", "Texto", "3"],
    ["Tipo", "Texto", "4"]
  ]
};

const proposedTable: RegulatoryTable = {
  title: "Test",
  headers: ["CAMPO", "FORMATO"],
  rows: [
    ["Protocolo", "1"],
    ["Descrição", "3"],
    ["Teste", "Teste"],
    ["Tipo", "4"]
  ]
};

const result = compareTables(origTable, proposedTable);
console.log(JSON.stringify(result.mergedRows, null, 2));
