import { Meeting, TimeSlot } from "@shared/schema";
import { format, addDays, parseISO, startOfWeek, isSameDay } from "date-fns";
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type WeeklyCalendarGridProps = {
  meeting: Meeting;
  timeSlots: TimeSlot[];
  isOrganizer?: boolean;
  onTimeSlotSelect?: (date: string, time: string) => void;
  selectedSlots?: Array<{ date: string; time: string }>;
  participants?: Array<{ name: string; color: string }>;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday

const WeeklyCalendarGrid = forwardRef<any, WeeklyCalendarGridProps>(({
  meeting,
  timeSlots,
  isOrganizer = false,
  onTimeSlotSelect,
  selectedSlots = [],
  participants = []
}, ref) => {
  // Refs for tracking drag behavior
  const isDraggingRef = useRef(false);
  const startCellRef = useRef<{day: number, hour: number} | null>(null);
  const [selectionCells, setSelectionCells] = useState<{day: number, hour: number}[]>([]);
  const [tempSelectionCells, setTempSelectionCells] = useState<{day: number, hour: number}[]>([]);
  
  // Format start date to the beginning of the week
  const startDate = parseISO(meeting.startDate);
  const weekStart = startOfWeek(startDate, { weekStartsOn: 0 }); // 0 = Sunday
  
  // Check if a time slot is selected
  const isSelected = (date: string, time: string) => {
    return selectedSlots.some(slot => slot.date === date && slot.time === time);
  };
  
  // Convert day and hour to date and time strings
  const getDayAndTimeFromCell = (day: number, hour: number) => {
    const date = addDays(weekStart, day);
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = `${hour}:00`;
    return { date: dateStr, time: timeStr };
  };
  
  // Handle mouse down on a cell
  const handleMouseDown = (day: number, hour: number) => {
    if (!isOrganizer) return;
    
    isDraggingRef.current = true;
    startCellRef.current = { day, hour };
    setTempSelectionCells([{ day, hour }]);
  };
  
  // Handle mouse over during drag
  const handleMouseOver = (day: number, hour: number) => {
    if (!isDraggingRef.current || !startCellRef.current) return;
    
    // Calculate the selected range
    const startDay = Math.min(startCellRef.current.day, day);
    const endDay = Math.max(startCellRef.current.day, day);
    const startHour = Math.min(startCellRef.current.hour, hour);
    const endHour = Math.max(startCellRef.current.hour, hour);
    
    const newSelection = [];
    
    for (let d = startDay; d <= endDay; d++) {
      for (let h = startHour; h <= endHour; h++) {
        newSelection.push({ day: d, hour: h });
      }
    }
    
    setTempSelectionCells(newSelection);
  };
  
  // Handle mouse up to end drag
  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    
    // Update the final selection
    setSelectionCells([...tempSelectionCells]);
    
    // Trigger the selection callback for all selected cells
    if (onTimeSlotSelect) {
      tempSelectionCells.forEach(cell => {
        const { date, time } = getDayAndTimeFromCell(cell.day, cell.hour);
        onTimeSlotSelect(date, time);
      });
    }
    
    // Reset drag state
    isDraggingRef.current = false;
    startCellRef.current = null;
    setTempSelectionCells([]);
  };
  
  // Add document-wide mouse up event listener
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      handleMouseUp();
    };
    
    document.addEventListener('mouseup', handleDocumentMouseUp);
    document.addEventListener('touchend', handleDocumentMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      document.removeEventListener('touchend', handleDocumentMouseUp);
    };
  }, []);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // This function will be called by the parent to force synchronization
    // of the parent's selected time slots with the calendar's internal state
    forceSync: (parentSlots: Array<{ date: string; time: string }>) => {
      console.log('WeeklyCalendarGrid - Syncing with parent slots:', parentSlots.length);
      
      // Reset the internal selection state based on the parent's slots
      const newSelectionCells: { day: number; hour: number }[] = [];
      
      // First, completely reset all state to prevent any ghost selections
      setSelectionCells([]);
      setTempSelectionCells([]);
      isDraggingRef.current = false;
      startCellRef.current = null;
      
      // Process parent slots only if there are any
      if (parentSlots.length > 0) {
        parentSlots.forEach(slot => {
          try {
            // Parse the date to determine the day of week
            const date = new Date(slot.date);
            // Convert to day index (0-6, Sunday to Saturday)
            const day = date.getDay();
            // Extract hour from time string (e.g., "14:00" -> 14)
            const hour = parseInt(slot.time.split(':')[0]);
            
            // Add to selection cells
            newSelectionCells.push({ day, hour });
          } catch (err) {
            console.error("Error processing slot during forceSync:", slot, err);
          }
        });
        
        // Update the internal state with the filtered parent slots
        setSelectionCells(newSelectionCells);
      }
      
      // Force immediate update by using a key state for re-render trigger
      // This is more reliable than relying on React's normal state updates
      setTimeout(() => {
        // This second update ensures the component fully refreshes
        setSelectionCells([...newSelectionCells]);
      }, 0);
    }
  }));
  
  return (
    <div className="overflow-auto">
      {isOrganizer && (
        <div className="bg-primary/5 rounded-lg p-3 mb-4 text-sm text-muted-foreground flex items-center gap-2">
          <span className="text-primary font-medium">💡 Tip:</span> 
          Click and drag to select multiple time slots at once.
        </div>
      )}
      
      <div className="min-w-[800px]">
        {/* Header row with days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-b border-r border-border/20 p-2"></div>
          
          {DAYS_OF_WEEK.map(day => {
            const date = addDays(weekStart, day);
            return (
              <div 
                key={`day-${day}`} 
                className="border-b border-r border-border/20 p-2 text-center"
              >
                <div className="text-sm font-medium">{format(date, "EEE")}</div>
                <div className="text-xs text-muted-foreground">{format(date, "MMM d")}</div>
              </div>
            );
          })}
        </div>
        
        {/* Time grid */}
        <div>
          {HOURS.map(hour => (
            <div key={`hour-${hour}`} className="grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Time label */}
              <div className="border-b border-r border-border/20 p-2 text-xs font-medium text-muted-foreground text-right pr-3">
                {format(new Date(2023, 0, 1, hour), "h a")}
              </div>
              
              {/* Day cells */}
              {DAYS_OF_WEEK.map(day => {
                const { date, time } = getDayAndTimeFromCell(day, hour);
                const slotIsSelected = isSelected(date, time);
                const isInTempSelection = tempSelectionCells.some(
                  cell => cell.day === day && cell.hour === hour
                );
                
                // Find available participants count for this time slot
                const timeSlotAvailability = timeSlots.find(
                  slot => slot.date === date && slot.time === time
                );
                const availableCount = timeSlotAvailability?.available || 0;
                const totalCount = timeSlotAvailability?.total || 0;
                
                // Generate a subset of participants for this slot if it's selected
                const slotParticipants = slotIsSelected ? 
                  participants.slice(0, Math.min(4, participants.length)) : [];
                
                return (
                  <div 
                    key={`cell-${day}-${hour}`} 
                    className={cn(
                      "h-12 relative",
                      (slotIsSelected || isInTempSelection) ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50",
                      "border-b border-r border-border/20",
                      slotIsSelected && "cell-selected",
                      // 인접한 선택된 셀과의 경계선 제거를 위한 클래스
                      slotIsSelected && timeSlots.some(slot => 
                        slot.date === format(addDays(weekStart, day+1), "yyyy-MM-dd") && 
                        slot.time === time && 
                        isSelected(slot.date, slot.time)
                      ) && "cell-selected-right",
                      slotIsSelected && timeSlots.some(slot => 
                        slot.date === date && 
                        slot.time === `${hour+1}:00` && 
                        isSelected(slot.date, slot.time)
                      ) && "cell-selected-bottom"
                    )}
                    onMouseDown={() => handleMouseDown(day, hour)}
                    onMouseOver={() => handleMouseOver(day, hour)}
                    onTouchStart={() => handleMouseDown(day, hour)}
                    onTouchMove={() => handleMouseOver(day, hour)}
                  >
                    {/* Top voted crown icon - only show for slots with votes */}
                    {slotIsSelected && availableCount > 0 && availableCount === Math.max(...timeSlots.filter(ts => isSelected(ts.date, ts.time)).map(ts => ts.available || 0)) && (
                      <div className="absolute top-0.5 right-0.5 filter-crown-glow animate-bounce-slow">
                        <Crown className="h-6 w-6 text-yellow-400" />
                      </div>
                    )}
                    
                    {/* Availability badge when not dragging */}
                    {!isDraggingRef.current && !isInTempSelection && availableCount > 0 && totalCount > 0 && (
                      <div className="absolute bottom-1 left-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs py-0 h-5",
                            availableCount === totalCount 
                              ? "border-green-500/30 text-green-500" 
                              : availableCount > totalCount / 2
                              ? "border-amber-500/30 text-amber-500"
                              : "border-primary/30 text-primary/70"
                          )}
                        >
                          {availableCount}/{totalCount}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Participant icons */}
                    {slotIsSelected && slotParticipants.length > 0 && (
                      <div className="absolute top-1 right-1 flex -space-x-2">
                        {slotParticipants.map((participant, index) => (
                          <div
                            key={`p-${index}`}
                            className="participant-icon w-6 h-6 flex items-center justify-center rounded-full"
                            style={{
                              backgroundColor: participant.color,
                              zIndex: slotParticipants.length - index,
                              animationDelay: `${index * 0.1}s`
                            }}
                          >
                            <span className="text-[10px] font-medium">
                              {participant.name.charAt(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default WeeklyCalendarGrid;