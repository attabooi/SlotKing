import { useState, useCallback } from "react";
import { TimeSlot } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

export const useTimeSlots = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Add a new time slot or update existing one
  const addTimeSlot = useCallback((newSlot: Omit<TimeSlot, 'id'> & { id?: string }) => {
    const slotId = newSlot.id || uuidv4();
    
    setTimeSlots(prev => {
      // Check if the slot with this id already exists
      const existingSlotIndex = prev.findIndex(slot => slot.id === slotId);
      
      if (existingSlotIndex >= 0) {
        // Update existing slot
        const updatedSlots = [...prev];
        updatedSlots[existingSlotIndex] = {
          ...updatedSlots[existingSlotIndex],
          ...newSlot,
          id: slotId
        };
        return updatedSlots;
      } else {
        // Add new slot
        return [...prev, { ...newSlot, id: slotId }];
      }
    });
    
    return slotId;
  }, []);
  
  // Delete a group of time slots by groupId
  const deleteSlotGroup = useCallback((groupId: string) => {
    setTimeSlots(prev => prev.filter(slot => slot.groupId !== groupId));
  }, []);
  
  // Delete a single time slot by id
  const deleteTimeSlot = useCallback((slotId: string) => {
    setTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
  }, []);
  
  // Toggle a time slot's selected state
  const toggleTimeSlot = useCallback((slotId: string) => {
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, selected: !slot.selected }
          : slot
      )
    );
  }, []);
  
  // Clear all selections
  const resetAll = useCallback(() => {
    setTimeSlots([]);
  }, []);
  
  // Get all selected time slots
  const selectedTimeSlots = timeSlots.filter(slot => slot.selected);
  
  // Get time slots grouped by groupId
  const getSlotsByGroup = useCallback((groupId: string) => {
    return timeSlots.filter(slot => slot.groupId === groupId);
  }, [timeSlots]);
  
  // Update participants for a slot
  const updateParticipants = useCallback((slotId: string, participants: { name: string; color: string }[]) => {
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, participants }
          : slot
      )
    );
  }, []);

  return {
    timeSlots,
    setTimeSlots,
    addTimeSlot,
    deleteSlotGroup,
    deleteTimeSlot,
    toggleTimeSlot,
    resetAll,
    selectedTimeSlots,
    getSlotsByGroup,
    updateParticipants
  };
};
