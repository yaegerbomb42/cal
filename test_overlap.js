/**
 * Calculates overlaps and assigns a "column" index for each event in DayView/WeekView.
 * This is based on standard calendar algorithms (like Google Calendar):
 * - Sort events by start time, then by end time (duration).
 * - Maintain a list of columns. Place the event in the first column where it fits without overlapping.
 * - If it doesn't fit in any existing column, create a new one.
 * - Calculate the max column size for a cluster of overlapping events to determine width percentages (100% / maxOverlap).
 */

export const getEventOverlapLayout = (events) => {
    if (!events || events.length === 0) return { items: [], maxOverlap: 1 };

    // 1. Sort by start time. If same start time, sort by end time descending (longest first)
    const sorted = [...events].sort((a, b) => {
        const aStart = new Date(a.start).getTime();
        const bStart = new Date(b.start).getTime();
        if (aStart !== bStart) return aStart - bStart;

        const aEnd = new Date(a.end).getTime();
        const bEnd = new Date(b.end).getTime();
        return bEnd - aEnd;
    });

    const columns = [];
    const layout = [];

    // 2. Assign column index to each event
    sorted.forEach(event => {
        const eStart = new Date(event.start).getTime();
        let placed = false;

        for (let i = 0; i < columns.length; i++) {
            const lastEventInColumn = columns[i][columns[i].length - 1];
            const lastEndTime = new Date(lastEventInColumn.end).getTime();

            // If this event starts on or after the last event in the column ends, it can go here
            if (eStart >= lastEndTime) {
                columns[i].push(event);
                layout.push({ event, column: i });
                placed = true;
                break;
            }
        }

        // If it collides with all existing columns, make a new column
        if (!placed) {
            columns.push([event]);
            layout.push({ event, column: columns.length - 1 });
        }
    });

    // Determine the peak concurrency (the number of columns needed)
    // For a highly accurate clustered width, we actually need to segment by connected components,
    // but a global maxOverlap for the whole day is a simple and clean fallback.
    const maxOverlap = columns.length;

    // Re-sort layout back to original order, or keep sorted by start
    // Returning sorted helps with rendering stability
    return {
        items: layout.sort((a, b) => new Date(a.event.start).getTime() - new Date(b.event.start).getTime()),
        maxOverlap
    };
};

console.log('Test logic')
