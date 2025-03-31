import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SimpleWeeklyCalendar from '@/components/SimpleWeeklyCalendar';
import { format, startOfWeek, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface Participant {
  name: string;
  color: string;
  isHost?: boolean;
}

interface SelectionGroup {
  id: string;
  slots: Array<{ day: number; hour: number }>;
  startTime: { day: number; hour: number };
  endTime: { day: number; hour: number };
  topSlot?: { day: number; hour: number };
}

const SimpleCalendarPage: React.FC = () => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: number; hour: number }>>([]);
  const [isHost, setIsHost] = useState(true);
  const [mockParticipants, setMockParticipants] = useState<Participant[]>([]);
  const [selectionGroups, setSelectionGroups] = useState<SelectionGroup[]>([]);

  const handleSelectTimeSlots = (slots: Array<{ day: number; hour: number }>) => {
    setSelectedSlots(slots);
    
    // For demo purposes, add mock participants for some slots
    if (slots.length > 0 && userName) {
      // This is only for demonstration - in real app you'd get this from server
      const demoParticipants: Participant[] = [
        { name: userName, color: getUserColor(userName), isHost: isHost }
      ];
      
      // Add some mock participants
      if (slots.length > 3) {
        demoParticipants.push(
          { name: 'John', color: getUserColor('John') },
          { name: 'Sarah', color: getUserColor('Sarah') }
        );
      }
      
      if (slots.length > 5) {
        demoParticipants.push(
          { name: 'Michael', color: getUserColor('Michael') },
          { name: 'Emma', color: getUserColor('Emma') },
          { name: 'Alex', color: getUserColor('Alex') }
        );
      }
      
      if (slots.length > 8) {
        demoParticipants.push(
          { name: 'Rachel', color: getUserColor('Rachel') },
          { name: 'David', color: getUserColor('David') },
          { name: 'Jessica', color: getUserColor('Jessica') },
          { name: 'Thomas', color: getUserColor('Thomas') },
          { name: 'Olivia', color: getUserColor('Olivia') },
          { name: 'William', color: getUserColor('William') }
        );
      }
      
      setMockParticipants(demoParticipants);
    }
  };
  
  const handleDeleteTimeSlot = (day: number, hour: number) => {
    const newSelectedSlots = selectedSlots.filter(
      slot => !(slot.day === day && slot.hour === hour)
    );
    setSelectedSlots(newSelectedSlots);
  };
  
  const handleDeleteSelectionGroup = (groupId: string) => {
    // This will be automatically handled by SimpleWeeklyCalendar
    // as it updates the selected slots which triggers our handleSelectTimeSlots
  };
  
  const handleGroupsChanged = (groups: SelectionGroup[]) => {
    setSelectionGroups(groups);
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
    <div className="w-full max-w-6xl mx-auto pb-16">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Weekly Availability Calendar</CardTitle>
          <CardDescription>
            Select time slots to schedule your meetings. You can choose multiple slots across different days.
          </CardDescription>
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
          
          <div className="flex items-center space-x-2 mb-6">
            <Switch
              id="host-mode"
              checked={isHost}
              onCheckedChange={setIsHost}
            />
            <Label htmlFor="host-mode">I am the meeting host</Label>
            {isHost && (
              <Badge variant="outline" className="ml-2 text-primary bg-primary/5">
                Host Mode
              </Badge>
            )}
          </div>
          
          <SimpleWeeklyCalendar 
            onSelectTimeSlots={handleSelectTimeSlots} 
            onDeleteTimeSlot={handleDeleteTimeSlot}
            onDeleteSelectionGroup={handleDeleteSelectionGroup}
            onGroupsChanged={handleGroupsChanged}
            userName={userName || 'User'}
            isHost={isHost}
            participants={mockParticipants}
          />
          
          {selectedSlots.length > 0 && (
            <div className="mt-6 p-4 bg-muted/40 rounded-lg border border-border/20">
              <h3 className="text-sm font-semibold mb-2">Meeting Summary</h3>
              <p className="text-sm mb-2">
                <span className="font-medium">Title:</span> {meetingTitle || "Untitled Meeting"}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shadow-sm"
                  style={{ backgroundColor: getUserColor(userName || 'User') }}
                >
                  {(userName || 'User').charAt(0).toUpperCase()}
                </div>
                <div className="text-sm font-medium">
                  {userName || 'User'} {isHost && <span className="text-[10px] ml-1">👑</span>}
                </div>
                <span className="text-xs px-2 py-0.5 bg-primary/20 rounded-full text-primary">
                  {selectedSlots.length} {selectedSlots.length === 1 ? 'slot' : 'slots'}
                </span>
              </div>
              
              <h4 className="text-xs font-medium mb-2">Selected Time Slots:</h4>
              <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
                {selectionGroups.map((group) => {
                  // Get the day for this group
                  const dayOfWeek = group.slots[0].day;
                  const day = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOfWeek), 'EEE');
                  
                  // Find the earliest and latest hour in this group
                  // We know that groups are only formed within the same day
                  const slots = group.slots.filter(slot => slot.day === dayOfWeek);
                  const sortedSlots = [...slots].sort((a, b) => a.hour - b.hour);
                  
                  const earliestHour = sortedSlots[0].hour;
                  const latestHour = sortedSlots[sortedSlots.length - 1].hour;
                  
                  // Format the time range
                  const startTime = format(new Date(2023, 0, 1, earliestHour), 'h a');
                  const endTime = format(new Date(2023, 0, 1, latestHour + 1), 'h a');
                  
                  const timeRange = earliestHour === latestHour 
                    ? startTime 
                    : `${startTime} - ${endTime}`;
                  
                  return (
                    <span 
                      key={group.id} 
                      className="px-3 py-1.5 bg-background rounded-md border border-border/20 inline-flex items-center gap-2 relative"
                    >
                      <span className="text-green-500 text-xs mr-0.5">🟢</span>
                      <span className="mr-1 font-medium">{day}</span>
                      <span>{timeRange}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSelectionGroup(group.id);
                        }}
                        className="ml-2 w-4 h-4 rounded-full hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-destructive"
                        title="Remove this time slot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                
                {selectionGroups.length === 0 && selectedSlots.length > 0 && (
                  <div className="text-muted-foreground italic text-xs">
                    Loading time slot groups...
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCalendarPage;