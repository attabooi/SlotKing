import { Meeting, TimeSlot } from "@shared/schema";
import { format } from "date-fns";
import { Crown, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import React from "react";

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
          <React.Fragment key={`row-${timeIndex}`}>
            <div 
              className="text-center py-2 text-sm text-gray-700 border-b border-gray-100"
            >
              {formattedTimes[timeIndex]}
            </div>
            
            {dates.map((date, dateIndex) => {
              const [slot, index] = getTimeSlot(date, time);
              const isSelected = slot?.selected;
              
              return (
                <div key={`slot-${dateIndex}-${timeIndex}`} className="p-1">
                  <div 
                    className={cn(
                      "calendar-button h-12 flex items-center justify-center relative",
                      isSelected && "selected",
                    )}
                    onClick={() => index >= 0 && onTimeSlotClick(index)}
                  >
                    {/* Crown icon indicating this is a selected organizer time slot */}
                    {isSelected && (
                      <>
                        <div className="crown-icon">
                          <Crown className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div 
                          className="participant-icon"
                          style={{
                            top: `-8px`,
                            left: `12px`,
                            backgroundColor: '#F87171',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '8px',
                            fontWeight: 500,
                          }}
                        >
                          <span>Y</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ParticipantCalendarGrid;
