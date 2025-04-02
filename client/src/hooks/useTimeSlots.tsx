import { useState, useCallback, useEffect } from "react";
import { TimeSlot } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

export const useTimeSlots = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [deletedSlotIds, setDeletedSlotIds] = useState<Set<string>>(new Set());
  
  // Add a new time slot or update existing one
  const addTimeSlot = useCallback((newSlot: Omit<TimeSlot, 'id'> & { id?: string }) => {
    const slotId = newSlot.id || uuidv4();
    
    // Don't add if this ID was previously deleted
    if (deletedSlotIds.has && deletedSlotIds.has(slotId)) {
      console.log('Preventing re-add of deleted slot:', slotId);
      return slotId;
    }
    
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
  }, [deletedSlotIds]);
  
  // Delete a group of time slots by groupId
  const deleteSlotGroup = useCallback((groupId: string) => {
    // First collect all the IDs that will be deleted
    const slotsToDelete = timeSlots.filter(slot => slot.groupId === groupId);
    const idsToDelete = slotsToDelete.map(slot => slot.id);
    
    // Add these IDs to the deleted set to prevent them from being re-added
    setDeletedSlotIds(prev => {
      // Fix for iteration issue - convert Set to Array and back
      const prevArray = Array.from(prev || []);
      const newSet = new Set(prevArray);
      idsToDelete.forEach(id => newSet.add(id));
      return newSet;
    });
    
    // Remove slots from state
    setTimeSlots(prev => prev.filter(slot => slot.groupId !== groupId));
    
    // Return IDs that were deleted for reference
    return idsToDelete;
  }, [timeSlots]);
  
  // Delete a single time slot by id
  const deleteTimeSlot = useCallback((slotId: string) => {
    // Add this ID to the deleted set to prevent it from being re-added
    setDeletedSlotIds(prev => {
      // Fix for iteration issue - convert Set to Array and back
      const prevArray = Array.from(prev);
      return new Set([...prevArray, slotId]);
    });
    
    // Remove from state
    setTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
  }, []);
  
  // Toggle a time slot's selected state
  const toggleTimeSlot = useCallback((slotId: string) => {
    // Don't toggle if this slot was deleted
    if (deletedSlotIds.has && deletedSlotIds.has(slotId)) {
      console.log('Cannot toggle deleted slot:', slotId);
      return;
    }
    
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, selected: !slot.selected }
          : slot
      )
    );
  }, [deletedSlotIds]);
  
  // Clear all selections
  const resetAll = useCallback(() => {
    setTimeSlots([]);
    setDeletedSlotIds(new Set()); // Reset deleted IDs tracking too
  }, []);
  
  // Get all selected time slots, ensuring we never show deleted slots
  const selectedTimeSlots = timeSlots
    .filter(slot => slot.selected && !(deletedSlotIds.has && deletedSlotIds.has(slot.id)));
  
  // Get time slots grouped by groupId, filtering out deleted slots
  const getSlotsByGroup = useCallback((groupId: string) => {
    return timeSlots.filter(
      slot => slot.groupId === groupId && !(deletedSlotIds.has && deletedSlotIds.has(slot.id))
    );
  }, [timeSlots, deletedSlotIds]);
  
  // Update participants for a slot
  const updateParticipants = useCallback((slotId: string, participants: { name: string; color: string }[]) => {
    // Don't update deleted slots
    if (deletedSlotIds.has && deletedSlotIds.has(slotId)) {
      console.log('Cannot update participants for deleted slot:', slotId);
      return;
    }
    
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, participants }
          : slot
      )
    );
  }, [deletedSlotIds]);
  
  // Debug log when slot state changes
  useEffect(() => {
    console.log('Current timeSlots count:', timeSlots.length);
    console.log('Deleted slot IDs count:', deletedSlotIds.size);
  }, [timeSlots, deletedSlotIds]);

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
