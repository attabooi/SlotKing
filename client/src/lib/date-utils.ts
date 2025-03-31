import { format, eachDayOfInterval, addDays, parseISO, startOfDay } from 'date-fns';
import { TimeSlot } from '@shared/schema';

/**
 * Generates an array of time slots based on the meeting parameters
 * @param startDate Start date of the meeting (YYYY-MM-DD)
 * @param endDate End date of the meeting (YYYY-MM-DD)
 * @param startTime Start time of each day (HH:MM)
 * @param endTime End time of each day (HH:MM)
 * @param slotDuration Duration of each time slot in minutes
 * @returns Array of time slots with date and time formatted
 */
export const generateTimeSlots = (
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  slotDuration: number
): TimeSlot[] => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  // Generate days between start and end (inclusive)
  const days = eachDayOfInterval({ start, end });
  
  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const slots: TimeSlot[] = [];
  
  // For each day, generate time slots
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const formattedDate = format(day, 'MMM d');
    
    // Generate time slots for the day
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (
      currentHour < endHour || 
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeStr = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;
      const formattedTime = format(
        new Date(2023, 0, 1, currentHour, currentMinute),
        'h:mm a'
      );
      
      slots.push({
        date: dateStr,
        time: timeStr,
        formattedDate,
        formattedTime
      });
      
      // Increment time by slot duration
      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute %= 60;
      }
    }
  });
  
  return slots;
};

/**
 * Formats a date range for display
 * @param startDate Start date string (YYYY-MM-DD)
 * @param endDate End date string (YYYY-MM-DD)
 * @returns Formatted date range string
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  const isSameMonth = format(start, 'MMM') === format(end, 'MMM');
  
  if (isSameMonth) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  } else {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }
};

/**
 * Finds the best time slots based on participants' availabilities
 * @param timeSlots Array of time slots with availability counts
 * @param minAvailability Minimum number of participants required to be available
 * @param maxResults Maximum number of results to return
 * @returns Array of best time slots
 */
export const findBestTimeSlots = (
  timeSlots: Array<TimeSlot & { available: number, total: number }>,
  minAvailability: number = 1,
  maxResults: number = 3
): Array<TimeSlot & { available: number, total: number }> => {
  // Filter slots with at least the minimum required availability
  const eligibleSlots = timeSlots.filter(slot => slot.available >= minAvailability);
  
  // Sort by availability (highest first)
  const sortedSlots = [...eligibleSlots].sort((a, b) => {
    // Sort by available count first
    if (b.available !== a.available) {
      return b.available - a.available;
    }
    
    // If tied, sort by date and time
    return `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`);
  });
  
  // Return the top results
  return sortedSlots.slice(0, maxResults);
};