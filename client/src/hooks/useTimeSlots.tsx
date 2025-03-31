import { useState } from "react";
import { TimeSlot } from "@shared/schema";

export const useTimeSlots = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Toggle a time slot's selected state
  const toggleTimeSlot = (index: number) => {
    if (index < 0 || index >= timeSlots.length) return;
    
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index] = {
      ...newTimeSlots[index],
      selected: !newTimeSlots[index].selected
    };
    
    setTimeSlots(newTimeSlots);
  };
  
  // Clear all selections
  const clearSelections = () => {
    const newTimeSlots = timeSlots.map(slot => ({
      ...slot,
      selected: false
    }));
    
    setTimeSlots(newTimeSlots);
  };
  
  // Get all selected time slots
  const selectedTimeSlots = timeSlots.filter(slot => slot.selected);
  
  return {
    timeSlots,
    setTimeSlots,
    toggleTimeSlot,
    clearSelections,
    selectedTimeSlots
  };
};
