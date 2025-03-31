import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SimpleWeeklyCalendar from '@/components/SimpleWeeklyCalendar';
import { format, startOfWeek, addDays } from 'date-fns';

const SimpleCalendarPage: React.FC = () => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: number; hour: number }>>([]);

  const handleSelectTimeSlots = (slots: Array<{ day: number; hour: number }>) => {
    setSelectedSlots(slots);
  };
  
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

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Weekly Availability Calendar</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="meetingTitle">Meeting Title</Label>
              <Input
                id="meetingTitle"
                placeholder="Team Sync-up"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="userName">Your Name</Label>
              <Input
                id="userName"
                placeholder="John Doe"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <SimpleWeeklyCalendar 
            onSelectTimeSlots={handleSelectTimeSlots} 
            userName={userName || 'User'}
          />
          
          {selectedSlots.length > 0 && (
            <div className="mt-6 p-4 bg-muted/40 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Selected Time Slots:</h3>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shadow-sm"
                  style={{ backgroundColor: getUserColor(userName || 'User') }}
                >
                  {(userName || 'User').charAt(0).toUpperCase()}
                </div>
                <div className="text-sm font-medium">{userName || 'User'}</div>
                <span className="text-xs px-2 py-0.5 bg-primary/20 rounded-full text-primary">
                  {selectedSlots.length} {selectedSlots.length === 1 ? 'slot' : 'slots'}
                </span>
              </div>
              
              <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-2">
                {selectedSlots.map((slot, index) => {
                  // Format day
                  const day = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), slot.day), 'EEE');
                  // Format hour
                  const hour = format(new Date(2023, 0, 1, slot.hour), 'h a');
                  
                  return (
                    <span key={index} className="px-2 py-1 bg-background rounded-md border border-border/20">
                      {day} {hour}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCalendarPage;