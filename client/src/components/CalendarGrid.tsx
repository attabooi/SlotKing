import { Meeting, TimeSlot } from "@shared/schema";
import { format } from "date-fns";
import React, { useState, useEffect, useRef } from "react";
import TimeSlotComponent from "./TimeSlot";

type CalendarGridProps = {
  meeting: Meeting;
  timeSlots: TimeSlot[];
  isOrganizer?: boolean;
  onTimeSlotSelect?: (date: string, time: string) => void;
  selectedSlots?: Array<{ date: string; time: string }>;
  participants?: Array<{ name: string; color: string }>;
  showDragHint?: boolean;
};

const CalendarGrid = ({ 
  meeting, 
  timeSlots, 
  isOrganizer = false, 
  onTimeSlotSelect,
  selectedSlots = [],
  participants = [],
  showDragHint = false
}: CalendarGridProps) => {
  // Group time slots by date and time
  const dates = Array.from(new Set(timeSlots.map(slot => slot.date)));
  const times = Array.from(new Set(timeSlots.map(slot => slot.time)));
  
  // Sort dates and times
  dates.sort();
  times.sort();
  
  // Format dates for display (Mon, May 10)
  const formattedDates = dates.map(date => {
    const dateObj = new Date(date);
    return format(dateObj, "EEE, MMM d");
  });
  
  // Format times for display (9:00 AM)
  const formattedTimes = times.map(time => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return format(date, "h:mm a");
  });
  
  // Get a time slot based on date and time
  const getTimeSlot = (date: string, time: string) => {
    return timeSlots.find(slot => slot.date === date && slot.time === time);
  };
  
  // Check if a time slot is selected
  const isSelected = (date: string, time: string) => {
    return selectedSlots.some(slot => slot.date === date && slot.time === time);
  };
  
  // Drag selection functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dateIndex: number; timeIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dateIndex: number; timeIndex: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ dateIndex: number; timeIndex: number }[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Handle mouse down on time slot
  const handleMouseDown = (dateIndex: number, timeIndex: number) => {
    if (!isOrganizer) return;
    
    setIsDragging(true);
    setDragStart({ dateIndex, timeIndex });
    setDragEnd({ dateIndex, timeIndex });
    setSelectedRange([{ dateIndex, timeIndex }]);
  };
  
  // Handle mouse over during drag
  const handleMouseOver = (dateIndex: number, timeIndex: number) => {
    if (!isDragging || !dragStart) return;
    
    setDragEnd({ dateIndex, timeIndex });
    
    // Calculate the selected range
    const startDateIndex = Math.min(dragStart.dateIndex, dateIndex);
    const endDateIndex = Math.max(dragStart.dateIndex, dateIndex);
    const startTimeIndex = Math.min(dragStart.timeIndex, timeIndex);
    const endTimeIndex = Math.max(dragStart.timeIndex, timeIndex);
    
    const newSelectedRange: { dateIndex: number; timeIndex: number }[] = [];
    
    for (let d = startDateIndex; d <= endDateIndex; d++) {
      for (let t = startTimeIndex; t <= endTimeIndex; t++) {
        newSelectedRange.push({ dateIndex: d, timeIndex: t });
      }
    }
    
    setSelectedRange(newSelectedRange);
  };
  
  // Handle mouse up to end drag
  const handleMouseUp = () => {
    if (!isDragging) return;
    
    // Trigger the selection callback for all selected slots
    if (onTimeSlotSelect && selectedRange.length > 0) {
      selectedRange.forEach((item) => {
        if (item.dateIndex >= 0 && item.dateIndex < dates.length &&
            item.timeIndex >= 0 && item.timeIndex < times.length) {
          onTimeSlotSelect(dates[item.dateIndex], times[item.timeIndex]);
        }
      });
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setSelectedRange([]);
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
  }, [isDragging, selectedRange]);

  return (
    <div className="overflow-x-auto" ref={gridRef}>
      {isOrganizer && showDragHint && (
        <div className="bg-primary/5 rounded-lg p-3 mb-4 text-sm text-gray-700 flex items-center gap-2">
          <span className="text-primary font-medium">💡 Tip:</span> 
          Click and drag to select multiple time slots at once.
        </div>
      )}
      
      <div className="min-w-max">
        <div className="grid grid-cols-[auto_repeat(auto-fill,minmax(100px,1fr))]">
          <div className="text-center py-3 text-sm font-medium text-gray-500 border-b border-gray-200">Time</div>
          
          {formattedDates.map((formattedDate, index) => (
            <div 
              key={`date-${index}`} 
              className="text-center py-3 text-sm font-medium text-gray-500 border-b border-gray-200"
            >
              {formattedDate}
            </div>
          ))}
          
          {times.map((time, timeIndex) => (
            <React.Fragment key={`row-${timeIndex}`}>
              <div 
                className="text-center py-2 text-sm text-gray-700 border-b border-gray-100"
              >
                {formattedTimes[timeIndex]}
              </div>
              
              {dates.map((date, dateIndex) => {
                const slot = getTimeSlot(date, time);
                const isInDragRange = selectedRange.some(
                  range => range.dateIndex === dateIndex && range.timeIndex === timeIndex
                );
                const slotIsSelected = isSelected(date, time);
                
                // Generate a subset of participants for this slot if it's selected
                const slotParticipants = slotIsSelected ? 
                  participants.slice(0, Math.min(3, participants.length)) : [];
                
                return (
                  <div 
                    key={`slot-${dateIndex}-${timeIndex}`} 
                    className="p-1"
                    onMouseDown={() => handleMouseDown(dateIndex, timeIndex)}
                    onMouseOver={() => handleMouseOver(dateIndex, timeIndex)}
                    onTouchStart={() => handleMouseDown(dateIndex, timeIndex)}
                    onTouchMove={() => handleMouseOver(dateIndex, timeIndex)}
                  >
                    <TimeSlotComponent 
                      available={slot?.available || 0}
                      total={slot?.total || 0}
                      selected={slotIsSelected || isInDragRange}
                      isOrganizer={isOrganizer && slotIsSelected}
                      onClick={() => onTimeSlotSelect?.(date, time)}
                      participants={slotParticipants}
                      showParticipants={slotIsSelected}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Availability Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-md bg-red-50 border border-red-100 inline-block mr-2"></span>
            <span>Some available</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-md bg-amber-50 border border-amber-100 inline-block mr-2"></span>
            <span>Half available</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-md bg-primary/10 border border-primary/20 inline-block mr-2"></span>
            <span>Most available</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-md bg-primary/15 border border-primary/30 inline-block mr-2"></span>
            <span>All available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
