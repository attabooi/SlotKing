import { Meeting, TimeSlot } from "@shared/schema";
import { format, addMinutes } from "date-fns";
import TimeSlotComponent from "./TimeSlot";

type CalendarGridProps = {
  meeting: Meeting;
  timeSlots: TimeSlot[];
};

const CalendarGrid = ({ meeting, timeSlots }: CalendarGridProps) => {
  // Group time slots by date and time
  const dates = [...new Set(timeSlots.map(slot => slot.date))];
  const times = [...new Set(timeSlots.map(slot => slot.time))];
  
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
  
  // Determine class based on availability
  const getAvailabilityClass = (available: number, total: number) => {
    if (total === 0) return "";
    if (available === total) return "available-all";
    if (available >= (3/4) * total) return "available-3";
    if (available >= (1/2) * total) return "available-2";
    if (available > 0) return "available-1";
    return "";
  };

  return (
    <div className="overflow-x-auto">
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
                const slot = getTimeSlot(date, time);
                const availabilityClass = slot 
                  ? getAvailabilityClass(slot.available || 0, slot.total || 0) 
                  : "";
                
                return (
                  <div key={`slot-${dateIndex}-${timeIndex}`} className="p-1">
                    <TimeSlotComponent 
                      available={slot?.available || 0}
                      total={slot?.total || 0}
                      className={availabilityClass}
                    />
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
      
      <div className="mt-6 flex justify-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full bg-red-200 inline-block mr-2"></span>
            <span className="text-gray-700">1 participant</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full bg-amber-200 inline-block mr-2"></span>
            <span className="text-gray-700">2 participants</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full bg-green-200 inline-block mr-2"></span>
            <span className="text-gray-700">3 participants</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full bg-green-400 inline-block mr-2"></span>
            <span className="text-gray-700">All available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
