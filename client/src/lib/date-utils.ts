import { TimeSlot } from "@shared/schema";
import { format, addDays, parse, addMinutes } from "date-fns";

// Function to generate time slots based on meeting parameters
export const generateTimeSlots = (
  startDate: string,
  endDate: string,
  startTime: number,
  endTime: number,
  timeSlotDuration: number
): TimeSlot[] => {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const timeSlots: TimeSlot[] = [];
  
  // For each day in the range
  let currentDate = startDateObj;
  
  while (currentDate <= endDateObj) {
    // Format date to YYYY-MM-DD
    const dateString = format(currentDate, "yyyy-MM-dd");
    
    // For each time slot in the day
    let currentTime = startTime;
    
    while (currentTime < endTime) {
      // Calculate minutes based on the time
      const hours = Math.floor(currentTime);
      const minutes = Math.round((currentTime - hours) * 60);
      
      // Format time as HH:MM
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      
      // Create time slot
      timeSlots.push({
        date: dateString,
        time: timeString,
        formattedDate: format(currentDate, "EEE, MMM d"),
        formattedTime: format(new Date().setHours(hours, minutes, 0), "h:mm a"),
        selected: false,
      });
      
      // Move to next time slot
      currentTime += timeSlotDuration / 60;
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1);
  }
  
  return timeSlots;
};

// Format the date range for display
export const formatDateRange = (startDate: string, endDate: string): string => {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  // If same month and year, just show date range
  if (
    startDateObj.getMonth() === endDateObj.getMonth() &&
    startDateObj.getFullYear() === endDateObj.getFullYear()
  ) {
    return `${format(startDateObj, "MMMM d")} - ${format(endDateObj, "d, yyyy")}`;
  }
  
  // If same year, show month and date range
  if (startDateObj.getFullYear() === endDateObj.getFullYear()) {
    return `${format(startDateObj, "MMMM d")} - ${format(endDateObj, "MMMM d, yyyy")}`;
  }
  
  // Otherwise, show full dates
  return `${format(startDateObj, "MMMM d, yyyy")} - ${format(endDateObj, "MMMM d, yyyy")}`;
};

// Calculate the best time slots based on availabilities
export const findBestTimeSlots = (
  timeSlots: TimeSlot[],
  availabilities: any[],
  numParticipants: number
): TimeSlot[] => {
  if (availabilities.length === 0) return [];
  
  // Count availability for each time slot
  const slotCounts = new Map<string, number>();
  
  availabilities.forEach(availability => {
    availability.timeSlots.forEach(slotKey => {
      const count = slotCounts.get(slotKey) || 0;
      slotCounts.set(slotKey, count + 1);
    });
  });
  
  // Mark the slots with their availability count
  const slotsWithCounts = timeSlots.map(slot => {
    const slotKey = `${slot.date}-${slot.time}`;
    const count = slotCounts.get(slotKey) || 0;
    
    return {
      ...slot,
      available: count,
      total: numParticipants
    };
  });
  
  // Sort by availability (highest first)
  return [...slotsWithCounts].sort((a, b) => (b.available || 0) - (a.available || 0));
};
