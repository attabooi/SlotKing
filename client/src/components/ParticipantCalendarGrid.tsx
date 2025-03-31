import { Meeting, TimeSlot } from "@shared/schema";
import { format } from "date-fns";
import { Check } from 'lucide-react';
import { cn } from "@/lib/utils";

type ParticipantCalendarGridProps = {
  meeting: Meeting;
  timeSlots: TimeSlot[];
  onTimeSlotClick: (index: number) => void;
};

const ParticipantCalendarGrid = ({ 
  meeting, 
  timeSlots,
  onTimeSlotClick
}: ParticipantCalendarGridProps) => {
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
  const getTimeSlot = (date: string, time: string): [TimeSlot | undefined, number] => {
    const slot = timeSlots.find(slot => slot.date === date && slot.time === time);
    const index = timeSlots.findIndex(slot => slot.date === date && slot.time === time);
    return [slot, index];
  };

  return (
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
          <>
            <div 
              key={`time-${timeIndex}`} 
              className="text-center py-2 text-sm text-gray-700 border-b border-gray-100"
            >
              {formattedTimes[timeIndex]}
            </div>
            
            {dates.map((date, dateIndex) => {
              const [slot, index] = getTimeSlot(date, time);
              
              return (
                <div key={`slot-${dateIndex}-${timeIndex}`} className="p-1">
                  <div 
                    className={cn(
                      "time-slot-reddit h-12 flex items-center justify-center",
                      slot?.selected 
                        ? "bg-gradient-to-br from-primary/5 to-primary/20 border-primary" 
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => onTimeSlotClick(index)}
                  >
                    {slot?.selected && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};

export default ParticipantCalendarGrid;
