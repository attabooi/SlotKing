import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion, AnimatePresence } from "framer-motion";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays, isToday, parseISO } from "date-fns";

interface TimeSlot {
  day: string;
  hour: string;
  date: string; // ISO date string (YYYY-MM-DD)
}

interface TimeBlock {
  id: string;
  day: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startHour: string;
  endHour: string;
}

export default function Create() {
  const navigate = useNavigate();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: string; hour: string; date: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: string; hour: string; date: string } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 16 }, (_, i) => `${i + 9}:00`);

  // Format week range for display
  const weekRange = `${format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;

  // Get the actual date for each day in the current week
  const getDateForDay = (dayIndex: number): Date => {
    const startOfCurrentWeek = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return addDays(startOfCurrentWeek, dayIndex);
  };

  // Get the ISO date string for a day index
  const getDateStringForDay = (dayIndex: number): string => {
    const date = getDateForDay(dayIndex);
    return format(date, 'yyyy-MM-dd');
  };

  // Check if a day is today
  const isDayToday = (dayIndex: number): boolean => {
    const date = getDateForDay(dayIndex);
    return isToday(date);
  };

  // Handle week navigation
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  // Reset all selections
  const handleReset = () => {
    setSelectedSlots([]);
    setTimeBlocks([]);
  };

  // Check if a time block already exists to prevent duplicates
  const isTimeBlockDuplicate = (date: string, startHour: string, endHour: string): boolean => {
    return timeBlocks.some(
      block => 
        block.date === date && 
        block.startHour === startHour && 
        block.endHour === endHour
    );
  };

  // Handle mouse events for drag selection
  const handleMouseDown = (day: string, hour: string, dayIndex: number) => {
    const dateString = getDateStringForDay(dayIndex);
    setIsDragging(true);
    setDragStart({ day, hour, date: dateString });
    setDragEnd({ day, hour, date: dateString });
  };

  const handleMouseEnter = (day: string, hour: string, dayIndex: number) => {
    if (isDragging && dragStart) {
      // Only allow dragging within the same day
      if (dragStart.day === day) {
        const dateString = getDateStringForDay(dayIndex);
        setDragEnd({ day, hour, date: dateString });
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      // Only process if start and end are in the same day
      if (dragStart.day === dragEnd.day) {
        const startIndex = hours.indexOf(dragStart.hour);
        const endIndex = hours.indexOf(dragEnd.hour);
        
        // If start and end are the same (single click), create a 1-hour block
        if (startIndex === endIndex) {
          handleSlotClick(dragStart.day, dragStart.hour, days.indexOf(dragStart.day));
        } else {
          // Ensure start is before end
          const actualStart = Math.min(startIndex, endIndex);
          const actualEnd = Math.max(startIndex, endIndex);
          
          // Create a new time block
          const newBlock: TimeBlock = {
            id: `${dragStart.date}-${dragStart.hour}-${Date.now()}`,
            day: dragStart.day,
            date: dragStart.date,
            startHour: hours[actualStart],
            endHour: hours[actualEnd],
          };
          
          // Check if this block already exists to prevent duplicates
          if (!isTimeBlockDuplicate(newBlock.date, newBlock.startHour, newBlock.endHour)) {
            // Add to time blocks
            setTimeBlocks(prev => [...prev, newBlock]);
            
            // Add all slots in the range to selected slots
            const newSlots: TimeSlot[] = [];
            for (let i = actualStart; i <= actualEnd; i++) {
              newSlots.push({ day: dragStart.day, hour: hours[i], date: dragStart.date });
            }
            
            setSelectedSlots(prev => {
              // Remove any existing slots for this day in this range
              const filtered = prev.filter(slot => 
                slot.date !== dragStart.date || 
                hours.indexOf(slot.hour) < actualStart || 
                hours.indexOf(slot.hour) > actualEnd
              );
              return [...filtered, ...newSlots];
            });
          }
        }
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Handle individual slot click
  const handleSlotClick = (day: string, hour: string, dayIndex: number) => {
    const dateString = getDateStringForDay(dayIndex);
    
    // Check if the slot is already selected
    const isSelected = selectedSlots.some(
      slot => slot.date === dateString && slot.hour === hour
    );
    
    if (isSelected) {
      // If already selected, remove it
      setSelectedSlots(prev => 
        prev.filter(slot => !(slot.date === dateString && slot.hour === hour))
      );
      
      // Also remove the corresponding time block
      setTimeBlocks(prev => 
        prev.filter(block => 
          !(block.date === dateString && block.startHour === hour && block.endHour === hour)
        )
      );
    } else {
      // If not selected, add it as a 1-hour block
      setSelectedSlots(prev => [...prev, { day, hour, date: dateString }]);
      
      // Create a time block for single hour selections
      const newBlock: TimeBlock = {
        id: `${dateString}-${hour}-${Date.now()}`,
        day: day,
        date: dateString,
        startHour: hour,
        endHour: hour,
      };
      
      // Check if this block already exists to prevent duplicates
      if (!isTimeBlockDuplicate(newBlock.date, newBlock.startHour, newBlock.endHour)) {
        setTimeBlocks(prev => [...prev, newBlock]);
      }
    }
  };

  // Remove a time block
  const removeTimeBlock = (id: string) => {
    const block = timeBlocks.find(b => b.id === id);
    if (block) {
      // Remove the block
      setTimeBlocks(prev => prev.filter(b => b.id !== id));
      
      // Remove all slots in this block
      const startIndex = hours.indexOf(block.startHour);
      const endIndex = hours.indexOf(block.endHour);
      
      setSelectedSlots(prev => 
        prev.filter(slot => 
          slot.date !== block.date || 
          hours.indexOf(slot.hour) < startIndex || 
          hours.indexOf(slot.hour) > endIndex
        )
      );
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedSlots.length === 0) return;

    setIsSubmitting(true);
    try {
      // TODO: API 호출로 변경
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // 임시로 123을 meetingId로 사용
      navigate("/vote/123");
    } catch (error) {
      console.error("Failed to create meeting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add event listeners for mouse up outside the calendar
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, dragEnd]);

  // Check if a slot is in the current drag selection
  const isInDragSelection = (day: string, hour: string, dayIndex: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    if (day !== dragStart.day) return false;
    
    const hourIndex = hours.indexOf(hour);
    const startIndex = hours.indexOf(dragStart.hour);
    const endIndex = hours.indexOf(dragEnd.hour);
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    return hourIndex >= minIndex && hourIndex <= maxIndex;
  };

  // Check if a slot is selected
  const isSlotSelected = (day: string, hour: string, dayIndex: number) => {
    const dateString = getDateStringForDay(dayIndex);
    return selectedSlots.some(slot => slot.date === dateString && slot.hour === hour);
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string, day: string) => {
    const date = parseISO(dateString);
    return `${day}, ${format(date, 'MMM d')}`;
  };

  // Get text color based on day and time
  const getTextColorClass = (day: string, startHour: string) => {
    const hour = parseInt(startHour.split(':')[0]);
    
    // 시간대별 색상 (모든 요일에 동일하게 적용)
    if (hour < 12) {
      return 'text-blue-600'; // 오전
    } else if (hour < 15) {
      return 'text-green-600'; // 오후 초반
    } else if (hour < 18) {
      return 'text-orange-600'; // 오후 후반
    } else {
      return 'text-indigo-600'; // 저녁
    }
  };

  // Get day text color
  const getDayTextColorClass = (day: string) => {
    if (day === 'Sat') {
      return 'text-blue-500';
    }
    if (day === 'Sun') {
      return 'text-red-500';
    }
    return 'text-gray-900';
  };

  // Get dot color based on day
  const getDotColorClass = (day: string) => {
    if (day === 'Sat') {
      return 'bg-blue-500';
    }
    if (day === 'Sun') {
      return 'bg-red-500';
    }
    return 'bg-indigo-500';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-indigo-50"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <SlotKingLogo />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            Reset
          </motion.button>
        </div>

        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Select Available Time Slots
        </h1>

        {/* Week Navigation */}
        <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-lg shadow-md">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToPreviousWeek}
            className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md font-medium"
          >
            Previous Week
          </motion.button>
          <span className="text-lg font-medium text-indigo-700">{weekRange}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goToNextWeek}
            className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md font-medium"
          >
            Next Week
          </motion.button>
        </div>

        {/* Calendar */}
        <div 
          ref={calendarRef}
          className="grid grid-cols-8 gap-2 bg-white p-4 rounded-lg shadow-md mb-6"
        >
          <div className="col-span-1" />
          {days.map((day, index) => (
            <div 
              key={day} 
              className={`text-center font-medium p-2 rounded-md ${
                isDayToday(index) 
                  ? "bg-purple-100 text-purple-600 border border-purple-300" 
                  : "text-purple-500"
              }`}
            >
              {day}
              {isDayToday(index) && (
                <div className="text-xs mt-1 font-semibold">Today</div>
              )}
            </div>
          ))}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="text-right text-purple-300">
                {hour}
              </div>
              {days.map((day, dayIndex) => (
                <motion.button
                  key={`${day}-${hour}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseDown={() => handleMouseDown(day, hour, dayIndex)}
                  onMouseEnter={() => handleMouseEnter(day, hour, dayIndex)}
                  onMouseUp={() => handleMouseUp()}
                  onClick={() => handleSlotClick(day, hour, dayIndex)}
                  className={`p-2 border rounded transition-colors text-sm font-medium ${
                    isInDragSelection(day, hour, dayIndex)
                      ? "bg-indigo-300 text-white border-indigo-400"
                      : isSlotSelected(day, hour, dayIndex)
                      ? "bg-indigo-500 text-white border-indigo-600" 
                      : isDayToday(dayIndex)
                      ? "hover:bg-purple-50 border-purple-200 text-slate-900"
                      : "hover:bg-indigo-50 border-slate-200 text-slate-900"
                  }`}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Selected Time Blocks Summary */}
        {timeBlocks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow-md mb-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-indigo-700">Selected Time Blocks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {timeBlocks.map((block) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${getDotColorClass(block.day)}`} />
                        <span className={`font-medium ${getDayTextColorClass(block.day)}`}>{block.day}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-500">
                          {format(parseISO(block.date), 'MMM d, yyyy')}
                        </div>
                        <div className={`font-bold ${getTextColorClass(block.day, block.startHour)}`}>
                          {block.startHour} - {block.endHour}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 p-3 flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeTimeBlock(block.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={timeBlocks.length === 0 || isSubmitting}
          className={`mt-8 w-full py-4 rounded-lg font-semibold text-lg shadow-lg transition-shadow ${
            timeBlocks.length === 0 || isSubmitting
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-xl"
          }`}
        >
          {isSubmitting ? "Creating..." : "Confirm and Share"}
        </motion.button>
      </div>
    </motion.div>
  );
} 