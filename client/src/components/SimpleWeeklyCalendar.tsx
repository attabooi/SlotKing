import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

interface Participant {
  name: string;
  color: string;
  isHost?: boolean;
}

// Enhanced SelectionGroup to represent a contiguous block of time
interface SelectionGroup {
  id: string;
  slots: Array<{ day: number; hour: number }>;
  startTime: { day: number; hour: number };
  endTime: { day: number; hour: number };
  topSlot?: { day: number; hour: number };
}

interface SimpleWeeklyCalendarProps {
  onSelectTimeSlots?: (selectedSlots: Array<{ day: number; hour: number }>, isAddOperation?: boolean) => void;
  onDeleteTimeSlot?: (day: number, hour: number) => void;
  onDeleteSelectionGroup?: (groupId: string) => void;
  onGroupsChanged?: (groups: SelectionGroup[]) => void;
  userName?: string;
  isHost?: boolean;
  participants?: Participant[];
  // Add controlled props
  selectedTimeSlots?: Array<{ day: number; hour: number }>;
  selectionGroups?: SelectionGroup[];
}

const SimpleWeeklyCalendar = React.forwardRef<any, SimpleWeeklyCalendarProps>(
  function SimpleWeeklyCalendar(props, ref) {
    const {
      onSelectTimeSlots,
      onDeleteTimeSlot,
      onDeleteSelectionGroup,
      onGroupsChanged,
      userName = 'User',
      isHost = false,
      participants = [],
      // Controlled props with defaults
      selectedTimeSlots = [],
      selectionGroups = []
    } = props;
    
    // State variables first
    const [isDragging, setIsDragging] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
      const today = new Date();
      return startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
    });
    const [selectedSlots, setSelectedSlots] = useState<Array<{ day: number; hour: number }>>([]);
    const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
    const [draggedSlots, setDraggedSlots] = useState<Array<{ day: number; hour: number }>>([]);
    const [internalGroups, setInternalGroups] = useState<SelectionGroup[]>([]);
    
    // Derived data
    const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Prevent text selection during drag
    useEffect(() => {
      if (!isDragging) return;
      
      const handleDisableSelect = (e: Event) => {
        e.preventDefault();
      };
      
      document.addEventListener('selectstart', handleDisableSelect);
      
      return () => {
        document.removeEventListener('selectstart', handleDisableSelect);
      };
    }, [isDragging]);
    
    // Generate a color for the user based on their name
    const getUserColor = (name: string) => {
      const colors = [
        '#F87171', // red-400
        '#FB923C', // orange-400
        '#FBBF24', // amber-400
        '#4ADE80', // green-400
        '#60A5FA', // blue-400
        '#A78BFA', // violet-400
        '#F472B6', // pink-400
      ];
      
      // Simple hash function to get a consistent color for a name
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      return colors[Math.abs(hash) % colors.length];
    };
    
    // Determine time of day for styling
    const getTimeOfDay = (hour: number) => {
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      return 'night';
    };
    
    // Get background styles based on time of day
    const getBackgroundStyle = (hour: number) => {
      const timeOfDay = getTimeOfDay(hour);
      
      if (timeOfDay === 'morning') {
        return 'time-morning'; // Sunrise tones
      } else if (timeOfDay === 'afternoon') {
        return 'time-afternoon'; // Sunlight tones
      } else {
        return 'time-night'; // Night tones
      }
    };
    
    // User information
    const userColor = getUserColor(userName);
    const userInitial = userName.charAt(0).toUpperCase();
    
    // Handle mouse down on a cell
    const handleMouseDown = (day: number, hour: number) => {
      setIsDragging(true);
      setDragStart({ day, hour });
      setDragEnd({ day, hour });
      setDraggedSlots([{ day, hour }]);
    };
    
    // Handle mouse over during drag
    const handleMouseOver = (day: number, hour: number) => {
      if (isDragging && dragStart) {
        setDragEnd({ day, hour });
        
        // Calculate the selected range
        const startDay = Math.min(dragStart.day, day);
        const endDay = Math.max(dragStart.day, day);
        const startHour = Math.min(dragStart.hour, hour);
        const endHour = Math.max(dragStart.hour, hour);
        
        // Create array of dragged slots
        const newDraggedSlots = [];
        
        for (let d = startDay; d <= endDay; d++) {
          for (let h = startHour; h <= endHour; h++) {
            newDraggedSlots.push({ day: d, hour: h });
          }
        }
        
        setDraggedSlots(newDraggedSlots);
      }
    };
    
    // Helper function for the mouse up action wrapped in useCallback
    const processMouseUp = useCallback(() => {
      if (isDragging && draggedSlots.length > 0) {
        // Create a new selection group based on the current drag
        if (dragStart && dragEnd) {
          // Group slots by day first - this is the key change to fix issue #1
          const slotsByDay: Record<number, Array<{ day: number; hour: number }>> = {};
          
          // First, group all dragged slots by day
          draggedSlots.forEach(slot => {
            if (!slotsByDay[slot.day]) {
              slotsByDay[slot.day] = [];
            }
            slotsByDay[slot.day].push(slot);
          });
          
          // Process each day's slots as a separate group
          const newGroups: SelectionGroup[] = [];
          const allNewSlots: Array<{ day: number; hour: number }> = [];
          
          Object.entries(slotsByDay).forEach(([day, daySlots]) => {
            const dayNumber = parseInt(day);
            
            // Sort the current day's slots by hour
            const sortedDaySlots = [...daySlots].sort((a, b) => a.hour - b.hour);
            
            if (sortedDaySlots.length > 0) {
              // Get the first and last slots for this day to determine the range
              const firstSlot = sortedDaySlots[0];
              const lastSlot = sortedDaySlots[sortedDaySlots.length - 1];
              
              // Check if this selection overlaps with existing selections for this day
              const overlappingSlots = selectedSlots.filter(existingSlot => 
                daySlots.some(daySlot => 
                  existingSlot.day === daySlot.day && existingSlot.hour === daySlot.hour
                )
              );
              
              // Remove any overlapping slots from the current selection
              const filteredSelectedSlots = selectedSlots.filter(existingSlot => 
                !overlappingSlots.some(overlap => 
                  existingSlot.day === overlap.day && existingSlot.hour === overlap.hour
                )
              );
              
              // Create a new group for this day's slots with a unique ID
              const groupId = uuidv4(); // This ID will be shared with the parent component
              console.log(`Created new group with ID: ${groupId}`);
              
              const newDayGroup: SelectionGroup = {
                id: groupId, // Using UUID for globally unique IDs 
                slots: sortedDaySlots,
                startTime: firstSlot,
                endTime: lastSlot,
                topSlot: firstSlot // Initialize topSlot with the first slot
              };
              
              newGroups.push(newDayGroup);
              
              // Tag these slots with their corresponding group ID for easier reference
              const taggedSlots = sortedDaySlots.map(slot => ({
                ...slot,
                groupId // Add groupId to each slot for reference when passed to the parent
              }));
              
              allNewSlots.push(...taggedSlots);
              
              // Update overall selected slots (filtering out overlaps will be done below)
              setSelectedSlots(prev => {
                const filtered = prev.filter(slot => 
                  !overlappingSlots.some(overlap => 
                    slot.day === overlap.day && slot.hour === overlap.hour
                  )
                );
                return [...filtered, ...sortedDaySlots];
              });
            }
          });
          
          // Update the state with all the new day-based groups
          setInternalGroups(prevGroups => [...prevGroups, ...newGroups]);
          
          // Call the callback if provided, with all slots from all day groups
          if (onSelectTimeSlots) {
            console.log(`Sending ${allNewSlots.length} slots to parent with their group IDs`);
            onSelectTimeSlots(allNewSlots, true); // true indicates this is an add operation
          }
          
          // Also notify parent about group changes
          if (onGroupsChanged) {
            const updatedGroups = [...internalGroups, ...newGroups];
            onGroupsChanged(updatedGroups);
          }
        }
      }
      
      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDraggedSlots([]);
    }, [isDragging, draggedSlots, dragStart, dragEnd, selectedSlots, onSelectTimeSlots, onGroupsChanged, internalGroups]);
    
    // Handle delete slot - but we'll instead find which group this slot belongs to
    // and remove the entire group for consistency
    const handleDeleteSlot = (e: React.MouseEvent, day: number, hour: number) => {
      e.stopPropagation();
      
      // Find which group this slot belongs to
      const groupToDelete = selectionGroups.find(group => 
        group.slots.some(slot => slot.day === day && slot.hour === hour)
      );
      
      if (groupToDelete) {
        // Use the existing handleDeleteGroup function to delete the entire group
        handleDeleteGroup(e, groupToDelete.id);
      } else {
        // Fallback for individual slot deletion (should not happen with our new approach)
        const newSelectedSlots = selectedSlots.filter(
          slot => !(slot.day === day && slot.hour === hour)
        );
        
        setSelectedSlots(newSelectedSlots);
        
        // Call the delete callback if provided
        if (onDeleteTimeSlot) {
          onDeleteTimeSlot(day, hour);
        } else if (onSelectTimeSlots) {
          onSelectTimeSlots(newSelectedSlots);
        }
      }
    };
    
    // Handle delete group of slots
    const handleDeleteGroup = (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      
      // Find the group to delete
      const groupToDelete = selectionGroups.find(group => 
        group.id === groupId
      );
      
      if (!groupToDelete) return;
      
      // Store the slots that will be deleted for notification to parent
      const deletedSlots = [...groupToDelete.slots];
      
      // Remove all slots in the group from selected slots
      const newSelectedSlots = selectedSlots.filter(existingSlot => 
        !groupToDelete.slots.some(groupSlot => 
          groupSlot.day === existingSlot.day && groupSlot.hour === existingSlot.hour
        )
      );
      
      // Also remove the group from the selectionGroups state
      const newSelectionGroups = selectionGroups.filter(group => group.id !== groupId);
      
      // Update states
      setSelectedSlots(newSelectedSlots);
      setInternalGroups(newSelectionGroups);
      
      console.log(`Deleting group with ID: ${groupId}`);
      
      // Call the onDeleteSelectionGroup callback first (more comprehensive handling)
      if (onDeleteSelectionGroup) {
        // This should handle centralized state update via useTimeSlots.deleteSlotGroup
        onDeleteSelectionGroup(groupId);
      } else {
        // Fallback: Notify parent of each deleted slot individually 
        if (onDeleteTimeSlot) {
          deletedSlots.forEach(slot => {
            onDeleteTimeSlot(slot.day, slot.hour);
          });
        }
        
        // Always call onSelectTimeSlots to notify parent
        if (onSelectTimeSlots) {
          onSelectTimeSlots(newSelectedSlots, false); // false indicates this is a deletion
        }
      }
    };
    
    // Check if a slot is in the current drag selection
    const isInDragSelection = (day: number, hour: number) => {
      return draggedSlots.some(slot => slot.day === day && slot.hour === hour);
    };
    
    // Check if a slot is selected
    const isSelected = (day: number, hour: number) => {
      return selectedSlots.some(slot => slot.day === day && slot.hour === hour);
    };
    
    // Week navigation
    const goToPreviousWeek = () => {
      setCurrentWeekStart(prev => subWeeks(prev, 1));
    };
    
    const goToNextWeek = () => {
      setCurrentWeekStart(prev => addWeeks(prev, 1));
    };
    
    const goToCurrentWeek = () => {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    };
    
    // Add document-wide mouse up event listener
    useEffect(() => {
      const handleDocumentMouseUp = () => {
        if (isDragging) {
          processMouseUp();
        }
      };
      
      document.addEventListener('mouseup', handleDocumentMouseUp);
      
      return () => {
        document.removeEventListener('mouseup', handleDocumentMouseUp);
      };
    }, [isDragging, processMouseUp]);
    
    // Synchronize with parent-provided props
    useEffect(() => {
      // Only update the internal state if we got valid props and they are different from current state
      if (selectedTimeSlots && selectedTimeSlots.length > 0 && 
          JSON.stringify(selectedTimeSlots) !== JSON.stringify(selectedSlots)) {
        setSelectedSlots([...selectedTimeSlots]);
      }
    }, [selectedTimeSlots]);
    
    // Synchronize groups with parent-provided props
    useEffect(() => {
      if (selectionGroups && selectionGroups.length > 0 &&
          JSON.stringify(selectionGroups) !== JSON.stringify(internalGroups)) {
        setInternalGroups([...selectionGroups]);
      }
    }, [selectionGroups, internalGroups]);
    
    // Format the week range for display
    const weekRangeText = `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`;
    
    // Only use real participants data, or just the host if it's the first group
    // Fix phantom participant issue by ensuring we have a single instance of each participant name
    const realParticipants: Participant[] = participants.length > 0 ? 
      // Filter out any duplicate participants with the same name (prevent ghost participants)
      // And ensure we don't have empty names
      participants
        .filter(p => p.name.trim() !== '')
        .filter((p, index, self) => 
          index === self.findIndex(t => t.name === p.name)
        )
      : 
      [{ name: userName || 'Host', color: userColor, isHost: true }];
    
    // Instead of calculating groups from selectedSlots, we'll use the internal groups state
    // which is updated every time a new drag operation is completed
    const calculatedGroups = useMemo(() => {
      // In controlled mode, prioritize the props from parent
      const groupsToUse = selectionGroups && selectionGroups.length > 0 ? selectionGroups : internalGroups;
      
      if (groupsToUse.length === 0) return [];
      
      // Process each group to ensure it has the right metadata
      return groupsToUse.map(group => {
        if (group.slots.length === 0) return group;
        
        // Sort the slots by day and hour
        const sortedSlots = [...group.slots].sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.hour - b.hour;
        });
        
        // Get the first and last slots to determine the range
        const firstSlot = sortedSlots[0];
        const lastSlot = sortedSlots[sortedSlots.length - 1];
        
        // Update the topSlot (the one with the lowest hour on the earliest day)
        let topSlot = firstSlot;
        for (const slot of sortedSlots) {
          if (slot.hour < topSlot.hour || (slot.hour === topSlot.hour && slot.day < topSlot.day)) {
            topSlot = slot;
          }
        }
        
        // Return the updated group
        return {
          ...group,
          startTime: firstSlot,
          endTime: lastSlot,
          topSlot: topSlot
        };
      }).filter(group => group.slots.length > 0); // Filter out any empty groups
    }, [selectionGroups, internalGroups]);
    
    // Function to check if a slot is the top slot of its group
    const isTopSlotOfGroup = (day: number, hour: number) => {
      return calculatedGroups.some(group => 
        group.topSlot && group.topSlot.day === day && group.topSlot.hour === hour
      );
    };
    
    // Find group for a slot
    const getSlotGroup = (day: number, hour: number) => {
      return calculatedGroups.find(group => 
        group.slots.some(slot => slot.day === day && slot.hour === hour)
      );
    };
    
    // Add a function to clear specific slots from parent
    const clearSlotsFromParent = useCallback((day: number, hour: number) => {
      if (onDeleteTimeSlot) {
        onDeleteTimeSlot(day, hour);
        
        // Also remove from our internal state to keep everything in sync
        const newSelectedSlots = selectedSlots.filter(
          slot => !(slot.day === day && slot.hour === hour)
        );
        setSelectedSlots(newSelectedSlots);
        
        // Update selection groups to remove any that now have empty slots
        const updatedGroups = internalGroups.filter(group => {
          const updatedSlots = group.slots.filter(
            slot => !(slot.day === day && slot.hour === hour)
          );
          return updatedSlots.length > 0;
        });
        setInternalGroups(updatedGroups);
      }
    }, [onDeleteTimeSlot, selectedSlots, internalGroups]);
    
    // Expose methods to parent via ref
    React.useImperativeHandle(ref, () => ({
      forceSync: (parentSlots: Array<{ date: string; time: string }>) => {
        console.log('Forcing sync with parent slots:', parentSlots);
        
        // First, fully reset all state to ensure a clean slate
        // This prevents any stale references or ghost selections
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        setDraggedSlots([]);
        
        // If no parent slots, just clear everything
        if (!parentSlots || parentSlots.length === 0) {
          console.log('No parent slots, clearing all selections');
          setSelectedSlots([]);
          setInternalGroups([]);
          return;
        }
        
        try {
          // Create a lookup of parent slots for efficient checking
          const parentSlotLookup = new Map<string, { day: number, hour: number }>();
          const convertedSlots: Array<{ day: number, hour: number }> = [];
          
          // Convert parent format (date/time strings) to our format (day/hour numbers)
          parentSlots.forEach(slot => {
            try {
              const date = new Date(slot.date);
              // Get day of week (0-6), adjust if needed for your week start day
              const day = date.getDay(); // Sunday = 0, Saturday = 6
              const hour = parseInt(slot.time.split(':')[0]);
              
              if (!isNaN(day) && !isNaN(hour)) {
                const key = `${day}-${hour}`;
                parentSlotLookup.set(key, { day, hour });
                convertedSlots.push({ day, hour });
              }
            } catch (err) {
              console.error('Error processing parent slot:', slot, err);
            }
          });
          
          console.log(`Converted ${convertedSlots.length} parent slots to internal format`);
          
          // Set the selected slots directly from the converted parent slots
          // Don't filter existing slots - completely replace them
          setSelectedSlots(convertedSlots);
          
          // Create entirely new selection groups based on contiguous slots
          // Group slots by day first
          const slotsByDay: Record<number, Array<{ day: number; hour: number }>> = {};
          
          convertedSlots.forEach(slot => {
            if (!slotsByDay[slot.day]) {
              slotsByDay[slot.day] = [];
            }
            slotsByDay[slot.day].push(slot);
          });
          
          // Create new selection groups from the grouped slots
          const newGroups: SelectionGroup[] = [];
          
          Object.entries(slotsByDay).forEach(([day, daySlots]) => {
            // Sort slots by hour
            const sortedSlots = [...daySlots].sort((a, b) => a.hour - b.hour);
            
            // Find contiguous ranges of hours
            let currentGroup: { day: number, slots: Array<{ day: number, hour: number }> } | null = null;
            
            sortedSlots.forEach((slot, index) => {
              // Start a new group if this is the first slot or if there's a gap
              if (index === 0 || slot.hour > sortedSlots[index - 1].hour + 1) {
                // If we have an existing group, finalize it
                if (currentGroup && currentGroup.slots.length > 0) {
                  const firstSlot = currentGroup.slots[0];
                  const lastSlot = currentGroup.slots[currentGroup.slots.length - 1];
                  
                  newGroups.push({
                    id: uuidv4(),
                    slots: [...currentGroup.slots],
                    startTime: firstSlot,
                    endTime: lastSlot,
                    topSlot: firstSlot
                  });
                }
                
                // Start a new group
                currentGroup = {
                  day: parseInt(day),
                  slots: [slot]
                };
              } else {
                // Add to the current group
                currentGroup?.slots.push(slot);
              }
              
              // If this is the last slot, finalize the current group
              if (index === sortedSlots.length - 1 && currentGroup) {
                const firstSlot = currentGroup.slots[0];
                const lastSlot = currentGroup.slots[currentGroup.slots.length - 1];
                
                newGroups.push({
                  id: uuidv4(),
                  slots: [...currentGroup.slots],
                  startTime: firstSlot,
                  endTime: lastSlot,
                  topSlot: firstSlot
                });
              }
            });
          });
          
          // Update the selection groups with the new groups
          setInternalGroups(newGroups);
          
          console.log(`Created ${newGroups.length} selection groups from parent slots`);
          
          // Notify parent component about the changes
          setTimeout(() => {
            if (onGroupsChanged) {
              onGroupsChanged(newGroups);
            }
          }, 0);
        } catch (error) {
          console.error('Error in forceSync:', error);
          // Ensure we don't leave the component in a broken state
          setSelectedSlots([]);
          setInternalGroups([]);
        }
      }
    }));
    
    // Notify parent component about group changes
    useEffect(() => {
      if (onGroupsChanged) {
        onGroupsChanged(calculatedGroups);
      }
    }, [calculatedGroups, onGroupsChanged]);
    
    return (
      <div className="w-full overflow-auto">
        <div className="bg-primary/5 rounded-lg p-3 mb-4 text-sm text-muted-foreground flex flex-col gap-2">
          <div>
            <span className="text-primary font-medium">💡 Tip:</span> Click and drag to select multiple time slots.
          </div>
          <div>
            <span className="text-primary font-medium">💡 Pro tip:</span> Selected slots will remain selected after dragging. Click the trash icon to delete an entire time block.
          </div>
        </div>
        
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousWeek}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToCurrentWeek}
              className="text-xs h-8"
            >
              Today
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextWeek}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm font-medium">{weekRangeText}</div>
        </div>
        
        <div className="min-w-[800px] border border-border/20 rounded-lg overflow-hidden">
          {/* Header row with days */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted/30">
            <div className="border-b border-r border-border/20 p-2"></div>
            
            {days.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={`day-${index}`} 
                  className={cn(
                    "border-b border-r border-border/20 p-2 text-center",
                    isToday && "bg-primary/10"
                  )}
                >
                  <div className="text-sm font-medium">{format(day, "EEE")}</div>
                  <div className={cn(
                    "text-xs text-muted-foreground",
                    isToday && "text-primary font-medium"
                  )}>
                    {format(day, "MMM d")}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Time grid */}
          <div>
            {hours.map((hour) => {
              const timeOfDay = getTimeOfDay(hour);
              const bgStyle = getBackgroundStyle(hour);
              
              return (
                <div 
                  key={`hour-${hour}`} 
                  className={cn(
                    "grid grid-cols-[60px_repeat(7,1fr)]",
                    bgStyle
                  )}
                >
                  {/* Time label */}
                  <div className="border-b border-r border-border/20 p-2 text-xs font-medium text-muted-foreground text-right pr-3">
                    {format(new Date(2023, 0, 1, hour), "h a")}
                  </div>
                  
                  {/* Day cells */}
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const isInSelection = isInDragSelection(dayIndex, hour);
                    const isSlotSelected = isSelected(dayIndex, hour);
                    
                    // Determine if this cell has selected neighbors for border removal
                    const hasRightSelectedNeighbor = isSlotSelected && selectedSlots.some(
                      slot => slot.day === dayIndex + 1 && slot.hour === hour
                    );
                    const hasBottomSelectedNeighbor = isSlotSelected && selectedSlots.some(
                      slot => slot.day === dayIndex && slot.hour === hour + 1
                    );
                    const hasTopSelectedNeighbor = isSlotSelected && selectedSlots.some(
                      slot => slot.day === dayIndex && slot.hour === hour - 1
                    );
                    
                    return (
                      <div 
                        key={`cell-${dayIndex}-${hour}`} 
                        className={cn(
                          // 선택되지 않은 셀에만 테두리 적용 
                          !isSlotSelected && "border-b border-r border-border/20", 
                          "h-12 relative transition-colors duration-150",
                          isInSelection && "bg-primary/15 hover:bg-primary/20",
                          // Add special group styling without transparency 
                          isSlotSelected && "slot-group-inner",
                          // Set default styles for non-grouped cells
                          !isSlotSelected && !isInSelection && `hover:bg-muted/30 ${bgStyle}`,
                          isDragging && "cursor-pointer"
                        )}
                        onMouseDown={() => handleMouseDown(dayIndex, hour)}
                        onMouseOver={() => handleMouseOver(dayIndex, hour)}
                      >
                        {/* Icons for selected slots */}
                        {isSlotSelected && (
                          <>
                            {/* Group delete button - only show on the top slot of each group */}
                            {isTopSlotOfGroup(dayIndex, hour) && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    const group = getSlotGroup(dayIndex, hour);
                                    if (group) handleDeleteGroup(e, group.id);
                                  }}
                                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-muted/90 hover:bg-muted text-muted-foreground hover:text-destructive flex items-center justify-center z-10 shadow-sm"
                                  title="Delete this time slot block"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                            
                            {/* Get the current cell's selection group (if any) */}
                            {isTopSlotOfGroup(dayIndex, hour) && (
                              <div className="absolute top-1 left-1 flex -space-x-1">
                                {realParticipants.slice(0, 5).map((participant, index) => (
                                  <div
                                    key={`p-${index}`}
                                    className="participant-icon w-5 h-5 flex items-center justify-center rounded-full border border-background/50 animate-in fade-in zoom-in duration-300"
                                    style={{
                                      backgroundColor: participant.color,
                                      zIndex: realParticipants.length - index,
                                      animationDelay: `${index * 0.05}s`
                                    }}
                                    title={`${participant.name}${participant.isHost ? ' (Host)' : ''}`}
                                  >
                                    {participant.isHost && (
                                      <span className="absolute -top-1.5 -right-1.5 text-[8px] host-crown">
                                        👑
                                      </span>
                                    )}
                                    <span className="text-[8px] font-medium text-white">
                                      {participant.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                                
                                {realParticipants.length > 5 && (
                                  <div 
                                    className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[8px] border border-background/50"
                                    title={`${realParticipants.length - 5} more participants`}
                                  >
                                    +{realParticipants.length - 5}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* 그룹화된 셀에 배경 인디케이터 추가하지 않음 */}
                            
                            {/* Show connection indicators only for slots within the same group */}
                            {isSlotSelected && (
                              <>
                                {/* Get the current slot's group */}
                                {(() => {
                                  const currentGroup = getSlotGroup(dayIndex, hour);
                                  if (!currentGroup) return null;
                                  
                                  // Only show connections within the same group
                                  return (
                                    <>
                                      {/* 그룹 연결 표시를 제거하고 하나의 통합된 배경으로 처리 */}
                                      {/* 커넥션 그라디언트 대신 영역 전체에 동일한 배경색을 적용합니다 */}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

export default SimpleWeeklyCalendar;