const getSafeEventEnd = (event) => {
  const start = new Date(event.start);
  const rawEnd = new Date(event.end || event.start);
  if (Number.isNaN(rawEnd.getTime())) {
    return new Date(start.getTime() + 15 * 60 * 1000);
  }
  if (rawEnd <= start) {
    return new Date(start.getTime() + 15 * 60 * 1000);
  }
  return rawEnd;
};

export const layoutOverlappingEvents = (events, { maxColumns = 10 } = {}) => {
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  const positioned = [];
  let active = [];

  sorted.forEach((event) => {
    const start = new Date(event.start);
    const end = getSafeEventEnd(event);

    active = active.filter(entry => entry.end > start);
    const usedColumns = new Set(active.map(entry => entry.column));
    let column = 0;
    while (usedColumns.has(column) && column < maxColumns) {
      column += 1;
    }
    if (column >= maxColumns) {
      column = maxColumns - 1;
    }

    const entry = { event, column, columns: 1, end };
    active.push(entry);
    positioned.push(entry);

    const overlapCount = Math.min(active.length, maxColumns);
    active.forEach(item => {
      item.columns = Math.max(item.columns, overlapCount);
    });
  });

  return positioned.map(entry => ({
    event: entry.event,
    column: entry.column,
    columns: entry.columns
  }));
};
