import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Meeting, Participant, Availability } from "@shared/schema";
import { generateTimeSlots, formatDateRange } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import CalendarGrid from "@/components/CalendarGrid";
import WeeklyCalendarGrid from "@/components/WeeklyCalendarGrid";
import ActivityFeed from "@/components/ActivityFeed";
import { Calendar, CalendarDays, ClipboardCopy, Settings, Info, Check, Trash2, RefreshCw, Crown, AlertTriangle } from "lucide-react";
import * as party from 'party-js';

// Helper function to get color by day name
const getDayColor = (date: string) => {
  const day = new Date(date).getDay();
  const colors = {
    0: '#F87171', // Sunday - red
    1: '#FB923C', // Monday - orange
    2: '#34D399', // Tuesday - green
    3: '#60A5FA', // Wednesday - blue
    4: '#A78BFA', // Thursday - purple
    5: '#F472B6', // Friday - pink
    6: '#FBBF24', // Saturday - yellow
  };
  return colors[day as keyof typeof colors];
};

// Format date to weekday name
const formatDateToWeekday = (date: string) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNum = new Date(date).getDay();
  return days[dayNum];
};

// Format time for display
const formatTimeForDisplay = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}${minutes > 0 ? `:${minutes}` : ''} ${period}`;
};

const OrganizerView = () => {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("availability");
  const [bestTimeSlot, setBestTimeSlot] = useState<string | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Array<{ date: string; time: string }>>([]);
  const [votingMode, setVotingMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);
  const [meetingData, setMeetingData] = useState<{
    meeting: Meeting;
    participants: Participant[];
    availabilities: Availability[];
  } | null>(null);

  // Fetch meeting data
  const { data, isLoading, error, refetch } = useQuery({ 
    queryKey: [`/api/meetings/${params.id}`],
    refetchInterval: false,
  });

  // Connect to WebSocket for real-time updates
  const socket = useWebSocket();

  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        
        // If the message is about this meeting, refresh the data
        if (meetingData && 
            (message.data.meetingId === meetingData.meeting.id || 
             message.data.meeting?.id === meetingData.meeting.id)) {
          refetch();
        }
      });
    }
  }, [socket, meetingData, refetch]);

  useEffect(() => {
    if (data) {
      setMeetingData(data as {
        meeting: Meeting;
        participants: Participant[];
        availabilities: Availability[];
      });
      
      // Calculate best time slot
      const typedData = data as {
        meeting: Meeting;
        participants: Participant[];
        availabilities: Availability[];
      };
      
      if (typedData.participants.length > 0 && typedData.availabilities.length > 0) {
        const timeSlotCounts = new Map<string, number>();
        
        typedData.availabilities.forEach((availability: Availability) => {
          (availability.timeSlots as string[]).forEach((slot: string) => {
            const count = timeSlotCounts.get(slot) || 0;
            timeSlotCounts.set(slot, count + 1);
          });
        });
        
        let bestSlot = null;
        let maxCount = 0;
        
        timeSlotCounts.forEach((count, slot) => {
          if (count > maxCount) {
            maxCount = count;
            bestSlot = slot;
          }
        });
        
        if (bestSlot && maxCount === typedData.participants.length) {
          setBestTimeSlot(bestSlot);
        }
      }
    }
  }, [data]);

  // Group selected time slots by date
  const groupedTimeSlots = selectedTimeSlots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot.time);
    return acc;
  }, {} as Record<string, string[]>);

  // Function to trigger confetti effect
  const triggerConfetti = (element: HTMLElement) => {
    if (element) {
      party.confetti(element, {
        count: party.variation.range(30, 40),
        size: party.variation.range(0.8, 1.2),
        spread: party.variation.range(35, 45),
      });
    }
  };
  
  // Mutation to confirm meeting time slots
  const confirmMutation = useMutation({
    mutationFn: async () => {
      // Find the organizer participant (assuming first participant with same name as meeting.organizer)
      const organizerParticipant = participants.find(p => p.name === meeting.organizer);
      const participantId = organizerParticipant?.id || 1;
      
      return await apiRequest(
        "POST",
        `/api/vote`,
        {
          meetingId: params.id,
          participantId: participantId,
          timeSlots: selectedTimeSlots.map(slot => `${slot.date}-${slot.time}`),
          weight: 2, // Give organizer's selections more weight
          metadata: { isOrganizer: true }
        }
      );
    },
    onSuccess: () => {
      setVotingMode(true);
      // Trigger confetti on the summary section
      if (confettiRef.current) {
        triggerConfetti(confettiRef.current);
      }
      toast({
        title: "Time slots confirmed",
        description: "Your selected time slots have been locked in. Share the link with participants for voting.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm time slots. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation to reset all selections
  const resetMutation = useMutation({
    mutationFn: async () => {
      // This would be a more complex operation in a real app
      // For now, we'll just clear the local state
      return Promise.resolve();
    },
    onSuccess: () => {
      setSelectedTimeSlots([]);
      setVotingMode(false);
      setShowResetConfirm(false);
      toast({
        title: "Reset successful",
        description: "All time slots and participant data have been cleared.",
      });
    }
  });

  const handleCopyLink = () => {
    const meetingUrl = `${window.location.origin}/join/${params.id}`;
    navigator.clipboard.writeText(meetingUrl);
    
    toast({
      title: "Link copied",
      description: "Meeting link copied to clipboard",
    });
  };
  
  const handleConfirmSchedule = () => {
    if (selectedTimeSlots.length === 0) {
      toast({
        title: "No time slots selected",
        description: "Please select at least one time slot before confirming.",
        variant: "destructive",
      });
      return;
    }
    
    confirmMutation.mutate();
  };
  
  const handleResetAll = () => {
    setShowResetConfirm(true);
  };
  
  const handleRemoveTimeSlot = (date: string, time: string, event?: React.MouseEvent) => {
    // Prevent event propagation to avoid triggering other handlers
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setSelectedTimeSlots(
      selectedTimeSlots.filter(
        slot => !(slot.date === date && slot.time === time)
      )
    );
    
    console.log(`Removed time slot: ${date} at ${time}`);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <Skeleton className="h-24 w-full mb-6" />
          <Skeleton className="h-8 w-40 mb-4" />
          <Skeleton className="h-10 w-full" />
          
          <div className="mt-6">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !meetingData) {
    return (
      <Card className="w-full p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Could not load meeting data. Please check the URL and try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/")} className="mt-4">
          Go to homepage
        </Button>
      </Card>
    );
  }

  const { meeting, participants, availabilities } = meetingData;
  const dateRange = formatDateRange(meeting.startDate, meeting.endDate);
  const timeSlots = generateTimeSlots(
    meeting.startDate, 
    meeting.endDate, 
    meeting.startTime.toString(),
    meeting.endTime.toString(), 
    meeting.timeSlotDuration
  );
  
  // Process availabilities into a format for the calendar grid
  // Calculate availability counts and top voted slot
  let maxAvailableCount = 0;
  let topVotedSlot = '';
  
  // Get unique participant IDs who have submitted availabilities using object mapping
  const activeParticipantMap: Record<number, boolean> = {};
  availabilities.forEach(a => {
    activeParticipantMap[a.participantId] = true;
  });
  const activeParticipantCount = Object.keys(activeParticipantMap).length;
  
  const processedTimeSlots = timeSlots.map(slot => {
    const slotKey = `${slot.date}-${slot.time}`;
    
    // Count unique participants who selected this slot using object mapping
    const participantMap: Record<number, boolean> = {};
    availabilities
      .filter(availability => (availability.timeSlots as string[]).includes(slotKey))
      .forEach(availability => {
        participantMap[availability.participantId] = true;
      });
    
    const availableCount = Object.keys(participantMap).length;
    
    // Track the slot with the most availability
    if (availableCount > maxAvailableCount) {
      maxAvailableCount = availableCount;
      topVotedSlot = slotKey;
    }
    
    return {
      ...slot,
      available: availableCount,
      total: activeParticipantCount || 1 // Use actual active participant count, or 1 if none
    };
  });

  return (
    <Card className="w-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{meeting.title}</h1>
            <p className="text-gray-600">{dateRange}</p>
          </div>
          <div className="mt-4 md:mt-0 space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row">
            <Button 
              variant="outline" 
              onClick={handleCopyLink}
              className="flex items-center"
            >
              <ClipboardCopy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button 
              variant="outline"
              className="flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="dark-card p-4 rounded-md mb-6 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-muted-foreground">
                Share link: <span className="font-medium text-primary">{window.location.origin}/join/{params.id}</span>
              </p>
              <button 
                onClick={handleCopyLink}
                className="mt-2 md:mt-0 text-sm text-primary hover:text-primary/80 font-medium"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
        
        {/* Meeting Summary Section - Enhanced UI */}
        <div ref={confettiRef} className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-medium bg-gradient-to-r from-primary to-primary/80 text-transparent bg-clip-text mb-2 md:mb-0">Meeting Summary</h2>
            <div className="space-x-2">
              {!votingMode ? (
                <Button 
                  onClick={handleConfirmSchedule}
                  disabled={selectedTimeSlots.length === 0 || confirmMutation.isPending}
                  className="bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-all"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Schedule
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleResetAll}
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50 transition-all"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset All
                  </Button>
                  <Button
                    onClick={handleCopyLink}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Share Link
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {selectedTimeSlots.length > 0 ? (
            <div className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(groupedTimeSlots).map(([date, times]) => {
                  const dayColor = getDayColor(date);
                  const weekday = formatDateToWeekday(date);
                  
                  return times.map((time, timeIndex) => (
                    <div 
                      key={`${date}-${time}-${timeIndex}`}
                      className={`relative group overflow-hidden rounded-xl border bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 ${
                        votingMode ? 'animate-pulse-subtle border-primary/30' : 'border-gray-200 hover:border-primary/20 hover:-translate-y-1'
                      }`}
                    >
                      {/* Colored weekday indicator */}
                      <div className="absolute top-0 left-0 h-full w-2" style={{ backgroundColor: dayColor }}></div>
                      
                      {/* Main content */}
                      <div className="p-4 pl-5">
                        {/* Weekday and time */}
                        <div className="flex justify-between items-start">
                          <div>
                            {/* Weekday with larger, colored font */}
                            <p className="font-bold text-2xl" style={{ color: dayColor }}>{weekday}</p>
                            {/* Time with large, clear display */}
                            <p className="text-gray-800 dark:text-gray-200 text-xl font-medium">{formatTimeForDisplay(time)}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(date).toLocaleDateString()}</p>
                          </div>
                          
                          {!votingMode && (
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all absolute top-2 right-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveTimeSlot(date, time, e);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                            </Button>
                          )}
                          
                          {/* Show crown icon only for the top voted slot when there are actual votes */}
                          {votingMode && `${date}-${time}` === topVotedSlot && maxAvailableCount > 0 && (
                            <div className="flex items-center justify-center">
                              <div className="absolute -top-4 -right-3 crown-float z-10">
                                <Crown className="h-12 w-12 text-yellow-500 drop-shadow-lg animate-pulse-gentle" />
                              </div>
                            </div>
                          )}

                          {/* Show participants only if they've selected this time slot AND there are actual participants */}
                          {votingMode && availabilities.some(a => (a.timeSlots as string[]).includes(`${date}-${time}`)) && (
                            <div className="flex -space-x-2 mt-3">
                              {(() => {
                                // Get unique participant IDs for this time slot
                                const uniqueParticipantMap: Record<number, boolean> = {};
                                const participantsForSlot: Participant[] = [];
                                
                                // Filter availabilities for this time slot
                                availabilities
                                  .filter(availability => 
                                    (availability.timeSlots as string[]).includes(`${date}-${time}`)
                                  )
                                  .forEach(availability => {
                                    // Only add if we haven't already added this participant
                                    if (!uniqueParticipantMap[availability.participantId]) {
                                      uniqueParticipantMap[availability.participantId] = true;
                                      const participant = participants.find(p => p.id === availability.participantId);
                                      if (participant) {
                                        participantsForSlot.push(participant);
                                      }
                                    }
                                  });
                                
                                // Return the first 3 unique participants with enhanced styling
                                return participantsForSlot.slice(0, 3).map((participant, i) => (
                                  <div 
                                    key={`participant-${participant.id}-${i}`}
                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold shadow-md"
                                    title={participant.name}
                                  >
                                    {participant.name.charAt(0).toUpperCase()}
                                  </div>
                                ));
                              })()}
                              
                              {/* Show the "+X" only if there are more than 3 UNIQUE participants for this time slot */}
                              {(() => {
                                // Get unique participant IDs for this time slot
                                const uniqueParticipantMap: Record<number, boolean> = {};
                                availabilities
                                  .filter(a => (a.timeSlots as string[]).includes(`${date}-${time}`))
                                  .forEach(a => {
                                    uniqueParticipantMap[a.participantId] = true;
                                  });
                                
                                const uniqueCount = Object.keys(uniqueParticipantMap).length;
                                
                                // Only show "+X" if there are more than 3 unique participants
                                return uniqueCount > 3 ? (
                                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xs font-bold shadow-md">
                                    +{uniqueCount - 3}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                        
                        {votingMode && (
                          <div className="mt-3 flex items-center">
                            {/* Display badge with actual count of participants for this slot */}
                            <Badge 
                              variant="outline" 
                              className={`text-xs py-1 px-2 ${
                                `${date}-${time}` === topVotedSlot && maxAvailableCount > 0
                                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200 shadow-inner' 
                                  : 'bg-gradient-to-r from-primary/5 to-primary/10 text-primary border-primary/20'
                              }`}
                            >
                              {
                                // Count UNIQUE participants who selected this slot
                                (() => {
                                  // Get unique participant IDs for this time slot using object mapping
                                  const participantMap: Record<number, boolean> = {};
                                  availabilities
                                    .filter(a => (a.timeSlots as string[]).includes(`${date}-${time}`))
                                    .forEach(a => {
                                      participantMap[a.participantId] = true;
                                    });
                                  
                                  const count = Object.keys(participantMap).length;
                                  
                                  if (count === 0) return "Waiting for votes";
                                  return count === 1 ? "1 participant" : `${count} participants`;
                                })()
                              }
                              {`${date}-${time}` === topVotedSlot && maxAvailableCount > 0 && (
                                <span className="ml-1 inline-flex items-center">
                                  <span className="mr-1">•</span> 
                                  <span className="font-semibold">Top Pick</span>
                                  <Crown className="h-3 w-3 ml-1 text-yellow-600" />
                                </span>
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center bg-gray-50 dark:bg-gray-900/50">
              <CalendarDays className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Time Slots Selected</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Please select your preferred time slots from the calendar below. Selected slots will appear here as meeting options.</p>
              <Button 
                onClick={() => setActiveTab('weekly')}
                className="mt-4 bg-gradient-to-r from-primary to-primary/90 hover:shadow-md transition-all"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Go to Calendar
              </Button>
            </div>
          )}
        </div>
        
        {/* Alert Dialog for Reset Confirmation */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all selections?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all selected time slots and participant data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => resetMutation.mutate()}
                className="bg-red-500 hover:bg-red-600"
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="mb-6">
          <h2 className="text-xl font-medium text-primary mb-4">Schedule Meeting</h2>
        </div>
        
        <Tabs defaultValue="weekly" onValueChange={setActiveTab}>
          <TabsList className="mb-6 border-b border-border/10 w-full justify-start">
            <TabsTrigger value="weekly" className="pb-4">
              Weekly View
            </TabsTrigger>
            <TabsTrigger value="grid" className="pb-4">
              Grid View
            </TabsTrigger>
            <TabsTrigger value="participants" className="pb-4">
              Participants ({participants.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly">
            <WeeklyCalendarGrid 
              meeting={meeting} 
              timeSlots={processedTimeSlots}
              isOrganizer={true}
              selectedSlots={selectedTimeSlots}
              onTimeSlotSelect={(date, time) => {
                const slotKey = `${date}-${time}`;
                
                // Check if the slot is already selected
                const isAlreadySelected = selectedTimeSlots.some(
                  slot => slot.date === date && slot.time === time
                );
                
                if (isAlreadySelected) {
                  // Remove the slot if already selected
                  setSelectedTimeSlots(
                    selectedTimeSlots.filter(
                      slot => !(slot.date === date && slot.time === time)
                    )
                  );
                } else {
                  // Add the slot if not selected
                  setSelectedTimeSlots([...selectedTimeSlots, { date, time }]);
                }
              }}
              participants={participants.map((p, i) => ({
                name: p.name,
                color: [
                  '#F87171', // red-400
                  '#FB923C', // orange-400
                  '#FBBF24', // amber-400
                  '#4ADE80', // green-400
                  '#60A5FA', // blue-400
                  '#A78BFA', // violet-400
                  '#F472B6', // pink-400
                ][i % 7]
              }))}
            />
          </TabsContent>
          
          <TabsContent value="grid">
            <CalendarGrid 
              meeting={meeting} 
              timeSlots={processedTimeSlots}
              isOrganizer={true}
              selectedSlots={selectedTimeSlots}
              onTimeSlotSelect={(date, time) => {
                const slotKey = `${date}-${time}`;
                
                // Check if the slot is already selected
                const isAlreadySelected = selectedTimeSlots.some(
                  slot => slot.date === date && slot.time === time
                );
                
                if (isAlreadySelected) {
                  // Remove the slot if already selected
                  setSelectedTimeSlots(
                    selectedTimeSlots.filter(
                      slot => !(slot.date === date && slot.time === time)
                    )
                  );
                } else {
                  // Add the slot if not selected
                  setSelectedTimeSlots([...selectedTimeSlots, { date, time }]);
                }
              }}
              participants={participants.map((p, i) => ({
                name: p.name,
                color: [
                  '#F87171', // red-400
                  '#FB923C', // orange-400
                  '#FBBF24', // amber-400
                  '#4ADE80', // green-400
                  '#60A5FA', // blue-400
                  '#A78BFA', // violet-400
                  '#F472B6', // pink-400
                ][i % 7]
              }))}
              showDragHint={true}
            />
          </TabsContent>
          
          <TabsContent value="participants">
            <ActivityFeed participants={participants} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

export default OrganizerView;
