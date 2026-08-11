function shiftDates(startStr, endStr, newStartStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const newStart = new Date(newStartStr);
    const diff = end.getTime() - start.getTime();
    const newEnd = new Date(newStart.getTime() + diff);
    return { newStart: newStart.toISOString(), newEnd: newEnd.toISOString() };
}
console.log(shiftDates('2026-07-01', '2026-07-05', '2026-07-10'));
