import { Meeting, TimeSlot } from "@shared/schema";
import { format } from "date-fns";
import TimeSlotComponent from "./TimeSlot";

type CalendarGridProps = {
  meeting: Meeting;
  timeSlots: TimeSlot[];
};

const CalendarGrid = ({ meeting, timeSlots }: CalendarGridProps) => {
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
                
                return (
                  <div key={`slot-${dateIndex}-${timeIndex}`} className="p-1">
                    <TimeSlotComponent 
                      available={slot?.available || 0}
                      total={slot?.total || 0}
                    />
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-white rounded-md border shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Availability Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-red-50 to-red-100 border border-gray-200 inline-block mr-2"></span>
            <span className="text-gray-700">Some available</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-amber-50 to-amber-100 border border-gray-200 inline-block mr-2"></span>
            <span className="text-gray-700">Half available</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-green-50 to-green-100 border border-gray-200 inline-block mr-2"></span>
            <span className="text-gray-700">Most available</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded bg-gradient-to-br from-green-100 to-green-200 border border-gray-200 inline-block mr-2"></span>
            <span className="text-gray-700">All available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
