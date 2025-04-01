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
import { ArrowDown, Calendar, ClipboardCopy, Settings, Info, Check, Trash2, RefreshCw, Crown, AlertTriangle, Clock, Users } from "lucide-react";
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
      // Call the server reset endpoint
      const response = await apiRequest(`/api/meetings/${params.id}/reset`, 'POST');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset meeting');
      }
      
      // Clear UI state completely
      setSelectedTimeSlots([]);
      setVotingMode(false);
      setShowResetConfirm(false);
      setActiveTab("weekly");
      
      // Force a fresh fetch of meeting data to ensure we have the latest state
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${params.id}`] });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Meeting reset successful",
        description: "All participants, time slots, and votes have been cleared. Only you (the host) remain.",
        duration: 5000,
      });
      
      // Show visual confirmation with a clear fade effect and animation
      if (confettiRef.current) {
        // Add dramatic animation for better UX feedback
        confettiRef.current.classList.add('fade-reset');
        confettiRef.current.classList.add('pulse-effect');
        
        // Create a ripple effect from the center
        const ripple = document.createElement('div');
        ripple.className = 'reset-ripple';
        if (confettiRef.current.firstChild) {
          confettiRef.current.insertBefore(ripple, confettiRef.current.firstChild);
        } else {
          confettiRef.current.appendChild(ripple);
        }
        
        // Clean up animations after they complete
        setTimeout(() => {
          if (confettiRef.current) {
            confettiRef.current.classList.remove('fade-reset');
            confettiRef.current.classList.remove('pulse-effect');
            if (ripple.parentNode === confettiRef.current) {
              confettiRef.current.removeChild(ripple);
            }
          }
        }, 800);
      }
    },
    onError: (error) => {
      toast({
        title: "Reset failed",
        description: error.message || "There was an error resetting the meeting. Please try again.",
        variant: "destructive",
        duration: 5000,
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
    
    console.log(`Removing time slot: ${date} at ${time}`);
    
    // Get the group of slots with the same date (for this specific date)
    const targetKey = `${date}-${time}`;
    
    // Find all slots with the same date (they should be removed as a group)
    // Convert date string to consistent format to ensure proper comparison
    const normalizedDate = new Date(date).toISOString().split('T')[0];
    
    const slotsWithSameDate = selectedTimeSlots.filter(slot => {
      const slotNormalizedDate = new Date(slot.date).toISOString().split('T')[0];
      return slotNormalizedDate === normalizedDate;
    });
    
    // Log for debugging
    console.log(`Found ${slotsWithSameDate.length} slots with same date:`, slotsWithSameDate);
    
    // Remove all slots with the same date
    const updatedTimeSlots = selectedTimeSlots.filter(slot => {
      const slotNormalizedDate = new Date(slot.date).toISOString().split('T')[0];
      return slotNormalizedDate !== normalizedDate;
    });
    
    console.log(`Remaining slots after removal: ${updatedTimeSlots.length}`);
    
    // Update state with filtered slots
    setSelectedTimeSlots(updatedTimeSlots);
    
    // Add enhanced visual effect for the Meeting Summary area update after deleting a time slot
    if (confettiRef.current) {
      // Add slide-out animation for removed items
      confettiRef.current.classList.add('fade-reset');
      confettiRef.current.classList.add('slide-effect');
      
      // Create a subtle fade effect
      const fadeEffect = document.createElement('div');
      fadeEffect.className = 'delete-fade-effect';
      if (confettiRef.current.firstChild) {
        confettiRef.current.insertBefore(fadeEffect, confettiRef.current.firstChild);
      } else {
        confettiRef.current.appendChild(fadeEffect);
      }
      
      // Clean up animations
      setTimeout(() => {
        if (confettiRef.current) {
          confettiRef.current.classList.remove('fade-reset');
          confettiRef.current.classList.remove('slide-effect');
          if (fadeEffect.parentNode === confettiRef.current) {
            confettiRef.current.removeChild(fadeEffect);
          }
        }
      }, 600);
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
                      className={`relative group overflow-hidden rounded-lg border shadow-sm transition-all duration-300 ${
                        votingMode 
                          ? (`${date}-${time}` === topVotedSlot && maxAvailableCount > 0
                              ? 'animate-pulse-subtle border-yellow-300 bg-gradient-to-br from-card to-yellow-50/5' 
                              : 'border-primary/30 bg-gradient-to-br from-card to-primary/5')
                          : 'border-gray-200 hover:border-primary/20 hover:shadow-md bg-card'
                      }`}
                    >
                      {/* Colored bar with gradient overlay */}
                      <div className="absolute top-0 left-0 h-full w-1.5 opacity-90" 
                        style={{ 
                          background: `linear-gradient(to bottom, ${dayColor}, ${dayColor}80)`
                        }}
                      ></div>
                      
                      {/* Subtle day indicator pattern */}
                      <div className="absolute top-0 right-0 h-full w-full opacity-5 pointer-events-none"
                        style={{
                          backgroundImage: `radial-gradient(circle at 80% 20%, ${dayColor}, transparent 60%)`
                        }}
                      ></div>
                      
                      <div className="p-3 pl-4 relative z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg bg-gradient-to-r from-[#555] to-[#333] bg-clip-text text-transparent dark:from-white dark:to-gray-200" 
                              style={{ 
                                WebkitTextFillColor: 'transparent',
                                backgroundImage: `linear-gradient(to right, ${dayColor}, ${dayColor}99)` 
                              }}
                            >
                              {weekday}
                            </p>
                            <p className="text-gray-700 text-lg font-medium">{formatTimeForDisplay(time)}</p>
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
                          
                          {/* Enhanced crown icon with improved animation for the top voted slot */}
                          {votingMode && `${date}-${time}` === topVotedSlot && maxAvailableCount > 0 && (
                            <div className="flex items-center justify-center">
                              <div className="absolute -top-12 -right-6 crown-float z-20 animate-bounce-slow">
                                {/* Add shimmer effect to the crown */}
                                <div className="absolute inset-0 crown-shimmer"></div>
                                <Crown className="h-24 w-24 text-yellow-500 drop-shadow-xl filter-crown-glow" />
                                {/* Add small sparkles around the crown */}
                                <div className="absolute top-1/4 right-1/4 animate-ping-slow">
                                  <span className="block h-1.5 w-1.5 rounded-full bg-yellow-300"></span>
                                </div>
                                <div className="absolute bottom-1/3 left-1/3 animate-ping-slow delay-300">
                                  <span className="block h-2 w-2 rounded-full bg-yellow-200"></span>
                                </div>
                                <div className="absolute top-1/2 left-1/4 animate-ping-slow delay-700">
                                  <span className="block h-1 w-1 rounded-full bg-yellow-100"></span>
                                </div>
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
                                
                                // Return the first 3 unique participants with enhanced styling
                                return participantsForSlot.slice(0, 3).map((participant, i) => {
                                  // Get a color for this participant (cyclic)
                                  const participantColor = [
                                    '#F87171', // red-400
                                    '#FB923C', // orange-400
                                    '#FBBF24', // amber-400
                                    '#4ADE80', // green-400
                                    '#60A5FA', // blue-400
                                    '#A78BFA', // violet-400
                                    '#F472B6', // pink-400
                                  ][participants.findIndex(p => p.id === participant.id) % 7];
                                  
                                  return (
                                    <div 
                                      key={`participant-${participant.id}-${i}`}
                                      className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium transform transition-transform duration-300 hover:scale-110 participant-icon"
                                      title={participant.name}
                                      style={{ 
                                        backgroundColor: `${participantColor}20`, 
                                        borderColor: `${participantColor}40` 
                                      }}
                                    >
                                      <span style={{ color: participantColor }}>
                                        {participant.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  );
                                });
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
                                  <div className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
                                    +{uniqueCount - 3}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                        
                        {votingMode && (
                          <div className="mt-2 flex items-center">
                            {/* Enhanced badge with participant count and visual indicators */}
                            <Badge 
                              variant="outline" 
                              className={`text-xs py-1 px-2.5 ${
                                `${date}-${time}` === topVotedSlot && maxAvailableCount > 0
                                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 shadow-sm' 
                                  : 'bg-gradient-to-r from-primary/5 to-primary/10 text-primary border-primary/20 shadow-sm'
                              }`}
                            >
                              {/* Add icon based on status */}
                              {(() => {
                                // Get unique participant IDs for this time slot
                                const participantMap: Record<number, boolean> = {};
                                availabilities
                                  .filter(a => (a.timeSlots as string[]).includes(`${date}-${time}`))
                                  .forEach(a => {
                                    participantMap[a.participantId] = true;
                                  });
                                
                                const count = Object.keys(participantMap).length;
                                
                                if (`${date}-${time}` === topVotedSlot && maxAvailableCount > 0) {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <Crown className="h-3 w-3 text-yellow-600 mr-0.5" />
                                      <span>{count === 1 ? "1 participant" : `${count} participants`}</span>
                                      <span className="inline-flex items-center ml-1 text-yellow-600 font-semibold">• Top Pick</span>
                                    </div>
                                  );
                                } else if (count > 0) {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3 text-primary mr-0.5" />
                                      <span>{count === 1 ? "1 participant" : `${count} participants`}</span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-gray-400 mr-0.5" />
                                      <span className="text-gray-500">Waiting for votes</span>
                                    </div>
                                  );
                                }
                              })()
                              }
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
            <div className="mt-4 p-8 border border-dashed border-gray-300 rounded-lg text-center bg-background/50 transition-all duration-300 hover:bg-background hover:border-primary/30 group">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-primary/70" />
                </div>
                <p className="text-gray-500 text-base">No time slots selected yet.</p>
                <p className="text-gray-400 text-sm max-w-md mx-auto">Please select your preferred time slots from the calendar below. You can drag to select multiple slots at once.</p>
                <div className="mt-2 flex items-center justify-center">
                  <ArrowDown className="h-5 w-5 text-primary/50 animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Alert Dialog for Reset Confirmation */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-6 w-6 mr-2 text-red-500 animate-pulse" />
                Reset Meeting Completely?
              </AlertDialogTitle>
              <div className="w-full h-0.5 bg-gradient-to-r from-red-200 to-red-400 my-3"></div>
              <AlertDialogDescription className="mt-4">
                <p className="mb-3">This will <span className="font-bold text-red-600 underline decoration-red-300">permanently delete</span>:</p>
                <ul className="space-y-2 mb-4">
                  {[
                    "All participant data (except you as the host)",
                    "All submitted availability responses",
                    "All votes and time slot selections",
                    "All suggestions and scheduling progress"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-1 text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-amber-800 text-sm">
                  <p className="font-medium flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    You'll need to share the link again for participants to rejoin.
                  </p>
                  <p className="mt-1 text-xs">This action cannot be undone.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-5 space-x-3">
              <AlertDialogCancel className="border-gray-300 hover:bg-gray-100">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => resetMutation.mutate()}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md transition-all duration-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Everything
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
