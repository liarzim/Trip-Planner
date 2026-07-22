/**
 * Utility functions for formatting and converting time strings between 24-hour and 12-hour formats.
 */

// Converts any time string (e.g., "14:30", "2:30 PM", "02:30:00") into 24-hour format "HH:mm"
export const to24HourFormat = (timeStr: string): string => {
  if (!timeStr) return '';
  const clean = timeStr.trim().toLowerCase();
  
  // Match 12-hour pattern: "2:30 pm", "10:15 am", "02:30:00 pm"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const ampm = match12[3];
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes}`;
  }

  // Already 24-hour pattern "HH:mm"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hh = String(parseInt(match24[1], 10)).padStart(2, '0');
    const mm = match24[2];
    return `${hh}:${mm}`;
  }

  return timeStr;
};

// Converts any time string to 12-hour format "hh:mm AM/PM"
export const to12HourFormat = (timeStr: string): string => {
  if (!timeStr) return '';
  const hhmm24 = to24HourFormat(timeStr);
  const parts = hhmm24.split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, '0');
  return `${hh}:${minutes} ${ampm}`;
};

/**
 * Main formatter accepting user preference ('24h' | '12h')
 */
export const formatTimeByPreference = (
  timeStr: string | undefined | null,
  format: '24h' | '12h' = '24h'
): string => {
  if (!timeStr) return '';
  
  // If string contains date e.g. "2026-08-01 14:30"
  if (timeStr.includes(' ')) {
    const parts = timeStr.trim().split(' ');
    if (parts.length >= 2 && parts[0].includes('-')) {
      const datePart = parts[0];
      const timePart = parts.slice(1).join(' ');
      const formattedTime = format === '12h' ? to12HourFormat(timePart) : to24HourFormat(timePart);
      return `${datePart} ${formattedTime}`;
    }
  }

  return format === '12h' ? to12HourFormat(timeStr) : to24HourFormat(timeStr);
};
