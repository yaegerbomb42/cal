export const layoutOverlappingEvents = (events) => {
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  const positioned = [];
  let active = [];

  sorted.forEach((event) => {
    const start = new Date(event.start);

    active = active.filter(entry => new Date(entry.event.end) > start);
    const usedColumns = new Set(active.map(entry => entry.column));
    let column = 0;
    while (usedColumns.has(column)) column += 1;

    const entry = { event, column, columns: 1 };
    active.push(entry);
    positioned.push(entry);

    const maxColumns = Math.max(...active.map(item => item.column)) + 1;
    active.forEach(item => {
      item.columns = Math.max(item.columns, maxColumns);
    });
  });

  return positioned.map(entry => ({
    event: entry.event,
    column: entry.column,
    columns: entry.columns
  }));
};
