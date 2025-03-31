import React, { useState, useRef, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface SimpleWeeklyCalendarProps {
  onSelectTimeSlots?: (selectedSlots: Array<{ day: number; hour: number }>) => void;
  userName?: string;
}

const SimpleWeeklyCalendar: React.FC<SimpleWeeklyCalendarProps> = ({ 
  onSelectTimeSlots,
  userName = 'User'
}) => {
  // Get days of the week starting from Monday
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Define hours (e.g., 9 AM to 6 PM)
  const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9 AM to 6 PM
  
  // State for tracking selections
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: number; hour: number }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
  
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
  
  const userColor = getUserColor(userName);
  const userInitial = userName.charAt(0).toUpperCase();
  
  // Handle mouse down on a cell
  const handleMouseDown = (day: number, hour: number) => {
    setIsDragging(true);
    setDragStart({ day, hour });
    setDragEnd({ day, hour });
  };
  
  // Handle mouse over during drag
  const handleMouseOver = (day: number, hour: number) => {
    if (isDragging) {
      setDragEnd({ day, hour });
    }
  };
  
  // Handle mouse up to end drag
  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      // Calculate the selected range
      const startDay = Math.min(dragStart.day, dragEnd.day);
      const endDay = Math.max(dragStart.day, dragEnd.day);
      const startHour = Math.min(dragStart.hour, dragEnd.hour);
      const endHour = Math.max(dragStart.hour, dragEnd.hour);
      
      // Create array of selected slots
      const newSelectedSlots = [];
      
      for (let d = startDay; d <= endDay; d++) {
        for (let h = startHour; h <= endHour; h++) {
          newSelectedSlots.push({ day: d, hour: h });
        }
      }
      
      // Update selected slots
      setSelectedSlots(newSelectedSlots);
      
      // Call the callback if provided
      if (onSelectTimeSlots) {
        onSelectTimeSlots(newSelectedSlots);
      }
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };
  
  // Check if a slot is in the current drag selection
  const isInDragSelection = (day: number, hour: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    const startDay = Math.min(dragStart.day, dragEnd.day);
    const endDay = Math.max(dragStart.day, dragEnd.day);
    const startHour = Math.min(dragStart.hour, dragEnd.hour);
    const endHour = Math.max(dragStart.hour, dragEnd.hour);
    
    return day >= startDay && day <= endDay && hour >= startHour && hour <= endHour;
  };
  
  // Check if a slot is selected
  const isSelected = (day: number, hour: number) => {
    return selectedSlots.some(slot => slot.day === day && slot.hour === hour);
  };
  
  // Add document-wide mouse up event listener
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      handleMouseUp();
    };
    
    document.addEventListener('mouseup', handleDocumentMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, dragStart, dragEnd]);
  
  return (
    <div className="w-full overflow-auto">
      <div className="bg-primary/5 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
        <span className="text-primary font-medium">💡 Tip:</span> Click and drag to select multiple time slots.
      </div>
      
      <div className="min-w-[700px]">
        {/* Header row with days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-b border-r border-border/20 p-2"></div>
          
          {days.map((day, index) => (
            <div 
              key={`day-${index}`} 
              className="border-b border-r border-border/20 p-2 text-center"
            >
              <div className="text-sm font-medium">{format(day, "EEE")}</div>
              <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
            </div>
          ))}
        </div>
        
        {/* Time grid */}
        <div>
          {hours.map((hour, hourIndex) => (
            <div key={`hour-${hour}`} className="grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Time label */}
              <div className="border-b border-r border-border/20 p-2 text-xs font-medium text-muted-foreground text-right pr-3">
                {format(new Date(2023, 0, 1, hour), "h a")}
              </div>
              
              {/* Day cells */}
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const isInSelection = isInDragSelection(dayIndex, hourIndex);
                const isSlotSelected = isSelected(dayIndex, hourIndex);
                
                return (
                  <div 
                    key={`cell-${dayIndex}-${hourIndex}`} 
                    className={cn(
                      "border-b border-r border-border/20 h-12 relative transition-colors duration-150",
                      (isSlotSelected || isInSelection) ? "bg-primary/20 hover:bg-primary/25" : "hover:bg-muted/50",
                      isDragging && "cursor-pointer"
                    )}
                    onMouseDown={() => handleMouseDown(dayIndex, hourIndex)}
                    onMouseOver={() => handleMouseOver(dayIndex, hourIndex)}
                  >
                    {isSlotSelected && (
                      <div 
                        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shadow-sm animate-in fade-in zoom-in duration-300"
                        style={{ backgroundColor: userColor }}
                      >
                        {userInitial}
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
};

export default SimpleWeeklyCalendar;