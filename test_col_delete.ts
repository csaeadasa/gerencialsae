import { compareTables, RegulatoryTable } from "./src/lib/tableStructure";

const origTable: RegulatoryTable = {
  title: "Test",
  headers: ["CAMPO", "DESCRIÇÃO", "FORMATO"],
  rows: [
    ["Protocolo", "Numérico", "1"],
    ["Serviço", "Texto", "2"],
  ]
};

const proposedTable: RegulatoryTable = {
  title: "Test",
  headers: ["CAMPO", "FORMATO"],
  rows: [
    ["Protocolo", "1"],
    ["Serviço", "2"],
  ]
};

const result = compareTables(origTable, proposedTable);
console.log(JSON.stringify(result.mergedRows, null, 2));
