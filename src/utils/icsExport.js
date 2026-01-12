// ICS (iCalendar) export utility
export const generateICS = (events) => {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text) => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CalAI//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${event.id}@calai.app`);
    ics.push(`DTSTART:${formatDate(event.start)}`);
    ics.push(`DTEND:${formatDate(event.end)}`);
    ics.push(`SUMMARY:${escapeText(event.title)}`);
    
    if (event.description) {
      ics.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    
    if (event.location) {
      ics.push(`LOCATION:${escapeText(event.location)}`);
    }
    
    ics.push(`DTSTAMP:${formatDate(new Date())}`);
    ics.push(`CREATED:${formatDate(event.createdAt || new Date())}`);
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');

  return ics.join('\r\n');
};

export const downloadICS = (events, filename = 'calendar.ics') => {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
