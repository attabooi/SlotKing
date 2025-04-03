import { Meeting, TimeSlot } from "@shared/schema";
import { format, addDays, parseISO, startOfWeek, isSameDay } from "date-fns";
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import TimeSlotComponent from "./TimeSlot";

type WeeklyCalendarGridProps = {
  meeting: Meeting;
  timeSlots: TimeSlot[];
  isOrganizer?: boolean;
  onTimeSlotSelect?: (date: string, time: string) => void;
  onTimeSlotDelete?: (date: string, time: string) => void;
  onReset?: () => void;
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
  onTimeSlotDelete,
  onReset,
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
  
  // Handle slot deletion
  const handleSlotDelete = (date: string, time: string) => {
    if (!isOrganizer || !onTimeSlotDelete) return;
    
    // Remove the slot from the local state
    const updatedSlots = timeSlots.filter(
      slot => !(slot.date === date && slot.time === time)
    );
    
    // Call the parent's delete handler
    onTimeSlotDelete(date, time);
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
  
  // Render a time slot cell
  const renderTimeSlot = (day: number, hour: number) => {
    const { date, time } = getDayAndTimeFromCell(day, hour);
    const slot = timeSlots.find(s => s.date === date && s.time === time);
    const isSlotSelected = isSelected(date, time);
    const isInSelection = tempSelectionCells.some(cell => cell.day === day && cell.hour === hour);

    // Don't render if the slot is deleted
    if (!slot) return (
      <div
        key={`${day}-${hour}`}
        className="relative border border-gray-200"
      />
    );

    return (
      <div
        key={`${day}-${hour}`}
        className={cn(
          "relative border border-gray-200",
          isInSelection && "bg-primary/10",
          isSlotSelected && "bg-primary/20"
        )}
        onMouseDown={() => handleMouseDown(day, hour)}
        onMouseOver={() => handleMouseOver(day, hour)}
        onMouseUp={handleMouseUp}
      >
        <TimeSlotComponent
          available={slot.available || 0}
          total={participants.length}
          selected={isSlotSelected}
          isOrganizer={isOrganizer}
          participants={participants}
          showParticipants={true}
          onClick={() => isOrganizer ? handleSlotDelete(date, time) : onTimeSlotSelect?.(date, time)}
        />
      </div>
    );
  };
  
  return (
    <div className="w-full">
      {isOrganizer && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            모든 슬롯 초기화
          </button>
        </div>
      )}
      <div className="grid grid-cols-8 gap-0">
        {/* Time labels */}
        <div className="col-span-1">
          {HOURS.map(hour => (
            <div key={`hour-${hour}`} className="h-12 flex items-center justify-end pr-2 text-sm text-gray-500">
              {format(new Date().setHours(hour), "h a")}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="col-span-7 grid grid-cols-7 gap-0">
          {HOURS.map(hour => (
            <div key={`row-${hour}`} className="grid grid-cols-7 gap-0">
              {DAYS_OF_WEEK.map(day => renderTimeSlot(day, hour))}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .calendar-button {
          position: relative;
          width: 100%;
          height: 100%;
          transition: all 0.2s ease;
        }
        
        .calendar-button.organizer {
          cursor: pointer;
        }
        
        .calendar-button.selected {
          background-color: var(--primary-color);
          color: white;
        }
        
        .calendar-button:hover {
          opacity: 0.8;
        }
        
        .participant-icon {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: popIn 0.3s ease-out forwards;
        }
        
        @keyframes popIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .crown-float {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        /* Remove borders between selected cells */
        .cell-selected {
          border-right: none;
          border-bottom: none;
        }
        
        .cell-selected-right {
          border-right: none;
        }
        
        .cell-selected-bottom {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
});

export default WeeklyCalendarGrid;