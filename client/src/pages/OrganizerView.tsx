import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Meeting, Participant, Availability } from "@shared/schema";
import { generateTimeSlots, formatDateRange } from "@/lib/date-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
import { ClipboardCopy, Settings, Info, Check, Trash2, RefreshCw, Crown, AlertTriangle } from "lucide-react";
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

  // Ref for calendar component
  const calendarRef = useRef<HTMLDivElement>(null);
  const [selectedCalendarSlots, setSelectedCalendarSlots] = useState<Array<any>>([]);
  
  // Mutation to reset all selections
  const resetMutation = useMutation({
    mutationFn: async () => {
      // Clear all selections and reset UI state completely
      setSelectedTimeSlots([]);
      setVotingMode(false);
      setShowResetConfirm(false);
      
      // Reset all calendar-related state
      setActiveTab("weekly");
      
      // Force a fresh fetch of meeting data to ensure we have the latest state
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${params.id}`] });
      
      // In a real app with a database backend, we would make an API call to clear stored slots
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Reset successful",
        description: "All time slots have been cleared. Create new time slots to continue.",
        duration: 5000,
      });
      
      // Show visual confirmation with a clear fade effect
      if (confettiRef.current) {
        confettiRef.current.classList.add('fade-reset');
        setTimeout(() => {
          if (confettiRef.current) {
            confettiRef.current.classList.remove('fade-reset');
          }
        }, 500);
      }
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
    
    // Get the group of slots with the same date (for this specific date)
    const targetKey = `${date}-${time}`;
    
    // Find all slots with the same date (they should be removed as a group)
    const slotsWithSameDate = selectedTimeSlots.filter(slot => slot.date === date);
    const slotKeysToRemove = new Set(slotsWithSameDate.map(slot => `${slot.date}-${slot.time}`));
    
    // Remove all slots with the same date
    const updatedTimeSlots = selectedTimeSlots.filter(slot => slot.date !== date);
    setSelectedTimeSlots(updatedTimeSlots);
    
    // 타임슬롯 삭제 후 Meeting Summary 영역 업데이트를 위한 효과 추가
    if (confettiRef.current) {
      confettiRef.current.classList.add('fade-reset');
      setTimeout(() => {
        if (confettiRef.current) {
          confettiRef.current.classList.remove('fade-reset');
        }
      }, 500);
    }
    
    // Show a toast notification
    toast({
      title: "Time slot group deleted",
      description: `Removed ${slotsWithSameDate.length} time slots for ${new Date(date).toLocaleDateString()}`,
    });
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
        
        {/* Meeting Summary Section */}
        <div ref={confettiRef} className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-medium text-primary mb-2 md:mb-0">Meeting Summary</h2>
            <div className="space-x-2 flex">
              {!votingMode ? (
                <Button 
                  onClick={handleConfirmSchedule}
                  disabled={selectedTimeSlots.length === 0 || confirmMutation.isPending}
                  className="bg-gradient-to-r from-primary to-primary/90"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Schedule
                </Button>
              ) : (
                <Button
                  onClick={handleResetAll}
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              )}
              
              {/* 항상 표시되는 Reset 버튼 추가 */}
              <Button
                onClick={handleResetAll}
                variant="destructive"
                className="ml-2 bg-red-500 text-white hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
          
          {selectedTimeSlots.length > 0 ? (
            <div className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(groupedTimeSlots).map(([date, times]) => {
                  const dayColor = getDayColor(date);
                  const weekday = formatDateToWeekday(date);
                  
                  return times.map((time, timeIndex) => (
                    <div 
                      key={`${date}-${time}-${timeIndex}`}
                      className={`relative group overflow-hidden rounded-lg border shadow-sm transition-all duration-200 ${
                        votingMode ? 'animate-pulse-subtle border-primary/30' : 'border-gray-200 hover:border-primary/20'
                      }`}
                    >
                      <div className="absolute top-0 left-0 h-full w-1.5" style={{ backgroundColor: dayColor }}></div>
                      <div className="p-3 pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg" style={{ color: dayColor }}>{weekday}</p>
                            <p className="text-gray-700 text-lg">{formatTimeForDisplay(time)}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(date).toLocaleDateString()}</p>
                          </div>
                          
                          {!votingMode && (
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveTimeSlot(date, time, e);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </Button>
                          )}
                          
                          {/* Show crown icon only for the top voted slot when there are actual votes - 크기 증가 */}
                          {votingMode && `${date}-${time}` === topVotedSlot && maxAvailableCount > 0 && (
                            <div className="flex items-center justify-center animate-pulse-subtle">
                              <div className="absolute -top-10 -right-8 crown-float z-20">
                                <Crown className="h-24 w-24 text-yellow-500 drop-shadow-xl filter-drop-shadow" />
                              </div>
                            </div>
                          )}

                          {/* Show participants only if they've selected this time slot AND there are actual participants */}
                          {votingMode && availabilities.some(a => (a.timeSlots as string[]).includes(`${date}-${time}`)) && (
                            <div className="flex -space-x-2">
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
                                
                                // Return the first 3 unique participants
                                return participantsForSlot.slice(0, 3).map((participant, i) => (
                                  <div 
                                    key={`participant-${participant.id}-${i}`}
                                    className="w-6 h-6 rounded-full border-2 border-white bg-primary/20 flex items-center justify-center text-xs font-medium"
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
                                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium">
                                    +{uniqueCount - 3}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                        
                        {votingMode && (
                          <div className="mt-2 flex items-center">
                            {/* Display badge with actual count of participants for this slot */}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                `${date}-${time}` === topVotedSlot && maxAvailableCount > 0
                                  ? 'bg-yellow-50 text-yellow-600 border-yellow-200' 
                                  : 'bg-primary/5 text-primary border-primary/10'
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
                              {`${date}-${time}` === topVotedSlot && maxAvailableCount > 0 && ' • Top Pick'}
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
            <div className="mt-4 p-6 border border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">No time slots selected yet. Please select your preferred time slots from the calendar below.</p>
            </div>
          )}
        </div>
        
        {/* Alert Dialog for Reset Confirmation */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all selections?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all selected time slots and reset the scheduling process. Participant data will be preserved, but you'll start with a clean slate for scheduling. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => resetMutation.mutate()}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Reset All
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
