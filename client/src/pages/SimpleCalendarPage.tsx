import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SimpleWeeklyCalendar from '@/components/SimpleWeeklyCalendar';
import { format, startOfWeek, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Copy, Check, RefreshCw, Share2, Link2, ChevronRight, Users, Clock, ThumbsUp, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { TimeSlot } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import party from 'party-js';

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
  // Base state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [isHost, setIsHost] = useState(true);
  
  // New centralized state management for time slots
  const { 
    timeSlots, 
    addTimeSlot, 
    deleteTimeSlot,
    deleteSlotGroup, 
    resetAll: resetAllSlots,
    updateParticipants 
  } = useTimeSlots();
  
  // Legacy state - needed until full refactoring
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: number; hour: number }>>([]);
  const [mockParticipants, setMockParticipants] = useState<Participant[]>([]);
  const [selectionGroups, setSelectionGroups] = useState<SelectionGroup[]>([]);
  
  // Voting mode state
  const [isVotingMode, setIsVotingMode] = useState(false);
  const [confirmedGroups, setConfirmedGroups] = useState<SelectionGroup[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [animatedGroups, setAnimatedGroups] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Generate a share URL when confirmed groups are set
  useEffect(() => {
    if (confirmedGroups.length > 0) {
      // In a real app, this would be a unique URL with a meeting ID
      // For this demo, we'll just create a mock URL
      const base = window.location.origin;
      const mockMeetingId = Math.random().toString(36).substring(2, 10);
      setShareUrl(`${base}/join/${mockMeetingId}`);
    }
  }, [confirmedGroups]);

  const handleSelectTimeSlots = (slots: Array<{ day: number; hour: number }>, isAddOperation = true) => {
    console.log(`handleSelectTimeSlots called with ${slots.length} slots, isAddOperation: ${isAddOperation}`);
    
    // If it's an add operation, we should merge the new slots with existing ones
    // Otherwise, for example in a delete operation, we only update with the provided slots
    if (isAddOperation) {
      // Identify new slots that don't exist in the current selection
      const newSlots = slots.filter(newSlot => 
        !selectedSlots.some(existingSlot => 
          existingSlot.day === newSlot.day && existingSlot.hour === newSlot.hour
        )
      );
      
      // If we have new slots, add them to the existing selection and to new time slots system
      if (newSlots.length > 0) {
        console.log(`Adding ${newSlots.length} new slots to selection`);
        setSelectedSlots(prevSlots => [...prevSlots, ...newSlots]);
        
        // Group slots by day to match SimpleWeeklyCalendar's grouping strategy
        const slotsByDay: Record<number, Array<{ day: number; hour: number }>> = {};
        newSlots.forEach(slot => {
          if (!slotsByDay[slot.day]) {
            slotsByDay[slot.day] = [];
          }
          slotsByDay[slot.day].push(slot);
        });
        
        // Process each day separately
        Object.entries(slotsByDay).forEach(([day, daySlots]) => {
          // Create a unique groupId for each day (this parallels what SimpleWeeklyCalendar does)
          const dayGroupId = uuidv4();
          
          // Find the matching group from selectionGroups that might have been just created
          const matchingGroup = selectionGroups.find(group => 
            group.slots.some(groupSlot => 
              daySlots.some(slot => 
                slot.day === groupSlot.day && slot.hour === groupSlot.hour
              )
            )
          );
          
          // Use the existing group ID if found, otherwise use the new one
          const effectiveGroupId = matchingGroup?.id || dayGroupId;
          
          // Add these slots to our new centralized time slots state
          daySlots.forEach(slot => {
            const currentDate = new Date();
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const dayDate = addDays(weekStart, slot.day);
            const slotDate = format(dayDate, 'yyyy-MM-dd');
            const slotTime = format(new Date(0, 0, 0, slot.hour), 'HH:mm');
            
            addTimeSlot({
              date: slotDate,
              time: slotTime,
              formattedDate: format(dayDate, 'EEE, MMM d'),
              formattedTime: format(new Date(0, 0, 0, slot.hour), 'h a'),
              selected: true,
              participants: [{ name: userName || 'User', color: getUserColor(userName || 'User') }],
              groupId: effectiveGroupId
            });
          });
        });
      }
    } else {
      // In case of deletion or initial load, directly set the slots
      console.log(`Replacing all slots with ${slots.length} provided slots (delete operation or initial load)`);
      setSelectedSlots(slots);
      
      // For our centralized state, we would need to handle this differently
      // But for now, we'll continue supporting the legacy system
    }
    
    // Only update participants if we have slots and a username
    // We need to calculate this based on the expected result after the update
    const expectedSlotCount = isAddOperation ? 
      // For add operations: current slots plus any new ones that will be added
      selectedSlots.length + slots.filter(newSlot => 
        !selectedSlots.some(existingSlot => 
          existingSlot.day === newSlot.day && existingSlot.hour === newSlot.hour
        )
      ).length :
      // For replace/delete operations: just the count of slots provided
      slots.length;
    
    if (expectedSlotCount > 0 && userName) {
      // Only include the current user/host - no ghost participants
      const realParticipants: Participant[] = [
        { name: userName, color: getUserColor(userName), isHost: isHost }
      ];
      
      // Only host is shown during creation, other participants will only be added
      // when actual voting happens (via handleVoteForTimeSlot function)
      setMockParticipants(realParticipants);
    }
  };
  
  const handleDeleteTimeSlot = (day: number, hour: number) => {
    console.log(`handleDeleteTimeSlot called for day: ${day}, hour: ${hour}`);
    
    // Find which time slot groups this slot belongs to
    const affectedGroups = selectionGroups.filter(group => 
      group.slots.some(slot => slot.day === day && slot.hour === hour)
    );
    
    // First remove from local state
    const newSelectedSlots = selectedSlots.filter(
      slot => !(slot.day === day && slot.hour === hour)
    );
    setSelectedSlots(newSelectedSlots);
    
    // If the slot belongs to a group, delete the entire group from centralized state
    if (affectedGroups.length > 0) {
      affectedGroups.forEach(group => {
        console.log(`Deleting group ${group.id} because it contains the deleted slot`);
        deleteSlotGroup(group.id);
        
        // Also remove the group from selection groups state
        setSelectionGroups(prev => prev.filter(g => g.id !== group.id));
      });
    } else {
      // If we couldn't find a group, we might need to look through the centralized time slots
      // Find any slots in the timeSlots state that match this day and hour
      const currentDate = new Date();
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const dayDate = addDays(weekStart, day);
      const slotDate = format(dayDate, 'yyyy-MM-dd');
      const slotTime = format(new Date(0, 0, 0, hour), 'HH:mm');
      
      // Find matching slots in the centralized state
      timeSlots.forEach(slot => {
        if (slot.date === slotDate && slot.time === slotTime) {
          console.log(`Deleting individual slot with ID: ${slot.id}`);
          deleteTimeSlot(slot.id);
        }
      });
    }
    
    // Update the summary view
    handleSelectTimeSlots(newSelectedSlots, false);
  };
  
  const handleDeleteSelectionGroup = (groupId: string) => {
    console.log(`handleDeleteSelectionGroup called with ID: ${groupId}`);
    
    // Find the group to delete
    const groupToDelete = selectionGroups.find(group => group.id === groupId);
    
    if (!groupToDelete) {
      console.warn(`No selection group found with ID: ${groupId}`);
      // Still try to delete from centralized time slots management in case the groupId exists there
      deleteSlotGroup(groupId);
      return;
    }
    
    // Remove all slots in the group from selected slots
    const newSelectedSlots = selectedSlots.filter(existingSlot => 
      !groupToDelete.slots.some(groupSlot => 
        groupSlot.day === existingSlot.day && groupSlot.hour === existingSlot.hour
      )
    );
    
    // Remove the group from the selectionGroups state
    const newSelectionGroups = selectionGroups.filter(group => group.id !== groupId);
    
    // Update legacy states
    setSelectedSlots(newSelectedSlots);
    setSelectionGroups(newSelectionGroups);
    
    // Also remove from new centralized time slots management
    // This will work if the groupId in SimpleWeeklyCalendar matches the one in our time slots
    console.log(`Deleting slot group with ID: ${groupId} from centralized state`);
    deleteSlotGroup(groupId);
    
    // Notify SimpleWeeklyCalendar of the updated slots (this will update the summary view)
    // Pass false to indicate this is not an add operation but a deletion
    handleSelectTimeSlots(newSelectedSlots, false);
  };
  
  const handleGroupsChanged = (groups: SelectionGroup[]) => {
    setSelectionGroups(groups);
  };
  
  // Handler for confirming schedule and transitioning to voting mode
  const handleConfirmSchedule = () => {
    if (selectionGroups.length === 0) {
      toast({
        title: "No Time Slots Selected",
        description: "Please select at least one time slot before confirming the schedule.",
        variant: "destructive"
      });
      return;
    }
    
    // Save the current groups as confirmed
    setConfirmedGroups([...selectionGroups]);
    
    // Transition to voting mode
    setIsVotingMode(true);
    
    // Set all groups to be animated initially
    setAnimatedGroups(selectionGroups.map(group => group.id));
    
    toast({
      title: "Schedule Confirmed!",
      description: "Your time slots are now ready for participants to vote on.",
      variant: "default"
    });
    
    // After 3 seconds, stop the animation
    setTimeout(() => {
      setAnimatedGroups([]);
    }, 3000);
  };
  
  // Handler for resetting all selections and returning to host mode
  const handleResetAll = () => {
    // Reset app state
    setIsVotingMode(false);
    setConfirmedGroups([]);
    setShareUrl('');
    setMockParticipants([]);
    
    // Reset legacy state
    setSelectedSlots([]);
    setSelectionGroups([]);
    
    // Use the new centralized time slots state management
    resetAllSlots();
    
    toast({
      title: "Reset Complete",
      description: "All selections have been cleared. You can now create a new schedule.",
      variant: "default"
    });
  };
  
  // Handler for copying share link to clipboard
  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopySuccess(true);
        toast({
          title: "Link Copied!",
          description: "Share link has been copied to clipboard.",
          variant: "default"
        });
        
        // Reset the copy success state after 2 seconds
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      });
    }
  };
  
  // Reference to time slot elements
  const timeSlotRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Handler for participant voting on a time slot
  const handleVoteForTimeSlot = (groupId: string) => {
    if (!isVotingMode) return;
    
    // Get the DOM element for the time slot
    const timeSlotElement = timeSlotRefs.current[groupId];
    
    // Visual indicator animation
    setAnimatedGroups([groupId]);
    setTimeout(() => setAnimatedGroups([]), 1000);
    
    // Create confetti effect with party.js if element exists
    if (timeSlotElement) {
      // Create confetti burst effect
      party.confetti(timeSlotElement, {
        count: 40,
        size: 1.2,
        spread: 50,
        speed: 300,
        color: [party.Color.fromHex(getUserColor(userName || 'Anonymous')), party.Color.fromHex('#60A5FA')]
      });
      
      // Additional sparkles animation
      party.sparkles(timeSlotElement, {
        count: 20,
        size: 1.2
      });
    }
    
    // In a real app, this would make an API call to register the vote
    // For this demo, we'll update the mock participants
    setMockParticipants(prevParticipants => {
      // If the user is already in the list, don't add again
      if (prevParticipants.some(p => p.name === userName)) {
        return prevParticipants;
      }
      
      return [
        ...prevParticipants,
        { name: userName || 'Anonymous', color: getUserColor(userName || 'Anonymous') }
      ];
    });
    
    toast({
      title: "Vote Recorded! 🎉",
      description: "Your availability has been recorded for this time slot.",
      variant: "default"
    });
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
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
              Weekly Availability Calendar
            </CardTitle>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {isVotingMode ? (
              <>
                <div className="mb-2">Select your available time slots by clicking on them. Each selection will be recorded as a vote.</div>
                <div className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary/5 rounded-md text-primary/80 mt-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Voting is now open! Click any time slot to register your vote.</span>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2">Select time slots to schedule your meetings. You can choose multiple slots across different days.</div>
                <div className="flex items-center gap-1.5 text-xs px-3 py-2 bg-muted rounded-md mt-1">
                  <span>💡 Tip: Click and drag to select multiple hours in a row.</span>
                </div>
              </>
            )}
          </div>
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
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
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
            
            {/* Reset button to clear all selections */}
            <Button 
              variant="outline" 
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50"
              onClick={handleResetAll}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
          
          <SimpleWeeklyCalendar 
            onSelectTimeSlots={handleSelectTimeSlots} 
            onDeleteTimeSlot={handleDeleteTimeSlot}
            onDeleteSelectionGroup={handleDeleteSelectionGroup}
            onGroupsChanged={handleGroupsChanged}
            userName={userName || 'User'}
            isHost={isHost}
            participants={mockParticipants}
            // Pass the controlled props
            selectedTimeSlots={selectedSlots}
            selectionGroups={selectionGroups}
          />
          
          {(selectedSlots.length > 0 || isVotingMode) && (
            <div className="mt-8 p-6 bg-muted/30 rounded-xl border border-border/20 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  {isVotingMode ? (
                    <>
                      <ThumbsUp className="w-5 h-5" />
                      <span>Meeting Voting Phase</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      <span>Meeting Summary</span>
                    </>
                  )}
                </h3>
                
                {isVotingMode && (
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 px-3 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      <span>Voting Open</span>
                    </div>
                  </Badge>
                )}
              </div>
              
              <div className="mb-5 p-4 bg-background rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Meeting Title</h4>
                    <p className="text-base font-medium">{meetingTitle || "Untitled Meeting"}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm border-2 border-background"
                      style={{ backgroundColor: getUserColor(userName || 'User') }}
                    >
                      {(userName || 'User').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium flex items-center">
                        {userName || 'User'} {isHost && <span className="text-[10px] ml-1">👑</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isHost ? 'Meeting Host' : 'Participant'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 justify-end mt-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs px-2 py-0.5 bg-primary/10 rounded-full text-primary font-medium">
                    {selectedSlots.length} {selectedSlots.length === 1 ? 'time slot' : 'time slots'} selected
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Available Time Slots</h4>
                <div className="h-px flex-1 bg-border/30"></div>
              </div>
              
              {/* Grid layout for time slots */}
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectionGroups.map((group) => {
                  // Get the day for this group
                  const dayOfWeek = group.slots[0].day;
                  const dayDate = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOfWeek);
                  const day = format(dayDate, 'EEE');
                  
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
                  
                  // Color per weekday
                  const dayColors = {
                    Mon: "text-blue-600",
                    Tue: "text-purple-600",
                    Wed: "text-green-600",
                    Thu: "text-amber-600",
                    Fri: "text-rose-600",
                    Sat: "text-cyan-600",
                    Sun: "text-indigo-600"
                  };
                  
                  const dayColor = dayColors[day as keyof typeof dayColors] || "text-primary";
                  
                  return (
                    <div 
                      key={group.id}
                      ref={el => timeSlotRefs.current[group.id] = el}
                      className={`time-slot-card bg-gradient-to-b from-background to-muted/10 rounded-lg shadow-sm border p-4 transition-all relative group
                        ${isVotingMode ? 'cursor-pointer hover:scale-105 transform border-primary/40 hover:shadow-lg' : 'border-border/30 hover:shadow-md'}
                        ${mockParticipants.length > 0 ? 'hover:border-primary' : ''}
                        ${animatedGroups.includes(group.id) ? 'ring-2 ring-primary ring-opacity-50' : ''}
                      `}
                      onClick={() => isVotingMode && handleVoteForTimeSlot(group.id)}
                    >
                      {/* Day with colored badge */}
                      <div className="flex justify-between items-center mb-3">
                        <div className={`flex items-center gap-2`}>
                          <div className={`px-2 py-1 rounded-md font-bold ${dayColor} bg-opacity-10`}
                               style={{ backgroundColor: dayColor.includes('blue') ? 'rgba(59, 130, 246, 0.1)' : 
                                                        dayColor.includes('purple') ? 'rgba(147, 51, 234, 0.1)' :
                                                        dayColor.includes('green') ? 'rgba(34, 197, 94, 0.1)' :
                                                        dayColor.includes('amber') ? 'rgba(245, 158, 11, 0.1)' :
                                                        dayColor.includes('rose') ? 'rgba(244, 63, 94, 0.1)' :
                                                        dayColor.includes('cyan') ? 'rgba(6, 182, 212, 0.1)' :
                                                        dayColor.includes('indigo') ? 'rgba(79, 70, 229, 0.1)' : 'rgba(147, 197, 253, 0.1)' }}>
                            {day}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(dayDate, 'MMM d')}
                          </div>
                        </div>
                        
                        {!isVotingMode && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSelectionGroup(group.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center absolute top-2 right-2"
                            title="Remove this time slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Time range with larger font */}
                      <div className="text-xl font-medium text-foreground mb-1 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary/70" />
                        {timeRange}
                      </div>
                      
                      {/* Date display */}
                      <div className="text-xs text-muted-foreground">
                        {format(dayDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      
                      {/* Hours count badge */}
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-xs px-2 py-0.5 bg-muted/50 rounded-full">
                          {slots.length} {slots.length === 1 ? 'hour' : 'hours'}
                        </div>
                        
                        {isVotingMode && (
                          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <ThumbsUp className="w-3 h-3" />
                            <span>Click to vote</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Divider */}
                      <div className="h-px w-full bg-border/30 my-3"></div>
                      
                      {/* Participant indicator section */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground font-medium flex items-center">
                          {mockParticipants.length > 0 ? 'Participants' : 'No participants yet'}
                          
                          {/* Only show crown for the group with most participants when in voting mode */}
                          {isVotingMode && mockParticipants.length > 0 && 
                           selectionGroups.reduce((maxCount, currGroup) => 
                             Math.max(maxCount, mockParticipants.filter(p => p.name !== userName).length + (group.id === currGroup.id ? 1 : 0)), 0) === 
                           mockParticipants.filter(p => p.name !== userName).length + 1 && (
                            <span className="ml-1.5 flex items-center text-amber-500" title="Most popular time slot">
                              <Crown className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        
                        <div className="flex -space-x-1.5">
                          {mockParticipants.slice(0, 6).map((participant, index) => (
                            <div
                              key={`p-${index}-${participant.name}`}
                              className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-medium text-white shadow-sm"
                              style={{ 
                                backgroundColor: participant.color,
                                zIndex: 10 - index
                              }}
                              title={participant.name}
                            >
                              {participant.name.charAt(0).toUpperCase()}
                              {/* Only show host crown here, not popularity crown */}
                              {participant.isHost && (
                                <span className="absolute -top-1 -right-1 text-[8px]">👑</span>
                              )}
                            </div>
                          ))}
                          
                          {mockParticipants.length > 6 && (
                            <div 
                              className="w-7 h-7 rounded-full bg-muted text-[10px] flex items-center justify-center font-medium border-2 border-background shadow-sm"
                              title={`${mockParticipants.length - 6} more participants`}
                            >
                              +{mockParticipants.length - 6}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Animation effect for confirmed/voted slots */}
                      {isVotingMode && animatedGroups.includes(group.id) && (
                        <div className="absolute inset-0 rounded-lg animate-pulse bg-primary/20 pointer-events-none"></div>
                      )}
                    </div>
                  );
                })}
                
                {selectionGroups.length === 0 && selectedSlots.length > 0 && (
                  <div className="text-muted-foreground italic text-sm col-span-full">
                    Loading time slot groups...
                  </div>
                )}
                
                {selectionGroups.length === 0 && selectedSlots.length === 0 && (
                  <div className="text-muted-foreground italic text-sm col-span-full bg-muted/20 rounded-lg p-5 text-center">
                    No time slots selected yet. Click and drag on the calendar to select time slots.
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="mt-8 pt-5 border-t border-border/30">
                {!isVotingMode && isHost && (
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleConfirmSchedule}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white flex items-center gap-2 px-6 py-6 h-auto shadow-md hover:shadow-lg"
                      disabled={selectionGroups.length === 0}
                      size="lg"
                    >
                      <Calendar className="w-5 h-5 mr-1" />
                      <span className="text-base">Confirm Schedule</span>
                    </Button>
                  </div>
                )}
                
                {isVotingMode && (
                  <div className="flex flex-col space-y-6">
                    {/* Share section */}
                    <div className="bg-muted/20 rounded-lg p-4 shadow-sm">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-primary">
                        <Link2 className="w-4 h-4" />
                        <span>Share Meeting Link</span>
                      </h4>
                      
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                        <div className="flex-1 relative">
                          <div className="absolute left-3 top-0 bottom-0 flex items-center text-muted-foreground">
                            <Link2 className="w-4 h-4" />
                          </div>
                          <Input
                            value={shareUrl}
                            readOnly
                            className="pl-10 pr-10 bg-background border-primary/20 w-full h-full"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1 bottom-1"
                            onClick={handleCopyLink}
                          >
                            {copySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCopyLink}
                            variant="secondary"
                            className="flex-1 sm:flex-none flex items-center gap-2 bg-secondary/80 hover:bg-secondary"
                          >
                            <Copy className="w-4 h-4" />
                            {copySuccess ? "Copied!" : "Copy Link"}
                          </Button>
                          
                          <Button
                            variant="outline"
                            className="border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 flex-1 sm:flex-none"
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: meetingTitle || "Meeting Schedule",
                                  text: `Join my meeting and vote on available times.`,
                                  url: shareUrl
                                }).catch(err => {
                                  toast({
                                    title: "Sharing Failed",
                                    description: "Could not open the sharing menu. You can manually copy the link instead.",
                                    variant: "destructive"
                                  });
                                });
                              } else {
                                handleCopyLink();
                              }
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reset button with confirmation */}
                    <div className="flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Reset Meeting
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset Meeting Schedule?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will clear all selected time slots and return to the selection phase.
                              Any participants who have already voted will need to vote again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetAll} className="bg-destructive text-destructive-foreground">
                              Reset
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        {/* Helpful instruction or status for voting phase */}
        {isVotingMode && (
          <CardFooter className="flex flex-col px-6 pb-6 pt-0">
            <div className="flex items-center justify-center p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-lg mx-auto w-full mt-4">
              <div className="flex-shrink-0 mr-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-medium text-primary">Invite Participants</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Share this link with participants to let them vote on their preferred time slots.
                  <span className="hidden md:inline"> Click the time slots to record your own votes.</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-6 gap-1.5 text-xs text-muted-foreground">
              <span>Each click </span>
              <span className="px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded">🎉</span>
              <span>creates a confetti animation!</span>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default SimpleCalendarPage;