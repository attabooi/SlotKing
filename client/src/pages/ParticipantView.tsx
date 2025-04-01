import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Meeting, TimeSlot, Participant, Availability } from "@shared/schema";
import { generateTimeSlots, formatDateRange } from "@/lib/date-utils";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import * as party from 'party-js';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ParticipantCalendarGrid from "@/components/ParticipantCalendarGrid";
import { CheckCircle, Info, Zap } from "lucide-react";

// Helper function to get color by day name (matching the one in OrganizerView)
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

const ParticipantView = () => {
  const params = useParams<{ id: string }>();
  const searchParams = useSearch();
  const queryParams = new URLSearchParams(searchParams);
  const participantId = queryParams.get("participantId");
  
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const slotClickRef = useRef<HTMLDivElement>(null);
  
  interface MeetingData {
    meeting: Meeting;
    participants: Participant[];
    availabilities: Availability[];
  }

  // Fetch meeting data
  const { data: meetingData, isLoading, error } = useQuery<MeetingData>({ 
    queryKey: [`/api/meetings/${params.id}`],
  });
  
  // Time slots state
  const { timeSlots, toggleTimeSlot: originalToggleTimeSlot, clearSelections, selectedTimeSlots, setTimeSlots } = useTimeSlots();
  
  // Enhanced toggleTimeSlot with confetti effect
  const toggleTimeSlot = (index: number) => {
    // Get the current time slot element
    const timeSlotElements = document.querySelectorAll('.calendar-button');
    if (timeSlotElements[index]) {
      const target = timeSlotElements[index];
      // Trigger confetti only when selecting (not deselecting)
      if (!timeSlots[index].selected) {
        party.confetti(target as HTMLElement, {
          count: party.variation.range(20, 30),
          size: party.variation.range(0.6, 1),
          spread: party.variation.range(30, 40),
        });
      }
    }
    
    // Call the original toggle function
    originalToggleTimeSlot(index);
  };
  
  // Initialize time slots when meeting data loads
  useEffect(() => {
    if (meetingData) {
      const { meeting } = meetingData;
      const generatedTimeSlots = generateTimeSlots(
        meeting.startDate, 
        meeting.endDate, 
        meeting.startTime.toString(),
        meeting.endTime.toString(), 
        meeting.timeSlotDuration
      );
      
      // Check if participant already submitted availability
      const participantAvailability = meetingData.availabilities.find(
        availability => availability.participantId === parseInt(participantId || "0")
      );
      
      // If participant has existing availability, mark those slots as selected
      if (participantAvailability) {
        generatedTimeSlots.forEach((slot, index) => {
          const slotKey = `${slot.date}-${slot.time}`;
          if ((participantAvailability.timeSlots as string[]).includes(slotKey)) {
            generatedTimeSlots[index].selected = true;
          }
        });
      }
      
      // Set the time slots
      setTimeSlots(generatedTimeSlots);
    }
  }, [meetingData, participantId, setTimeSlots]);
  
  // Submit availability mutation
  const submitAvailability = useMutation({
    mutationFn: async () => {
      // Convert selected time slots to the expected format
      const formattedTimeSlots = selectedTimeSlots.map(
        slot => `${slot.date}-${slot.time}`
      );
      
      const response = await apiRequest(
        "POST",
        `/api/meetings/${params.id}/availability`,
        {
          participantId,
          timeSlots: formattedTimeSlots,
        }
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Availability submitted",
        description: "Your availability has been saved successfully!",
      });
      
      // Navigate to the organizer view
      navigate(`/meeting/${params.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit availability. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Group selected time slots by date
  const groupedTimeSlots = selectedTimeSlots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot.time);
    return acc;
  }, {} as Record<string, string[]>);

  // Trigger confetti effect for submit
  const triggerSubmitConfetti = () => {
    if (submitButtonRef.current) {
      party.confetti(submitButtonRef.current, {
        count: party.variation.range(40, 60),
        size: party.variation.range(0.8, 1.2),
        spread: party.variation.range(50, 70),
      });
    }
  };

  const handleSubmit = () => {
    if (selectedTimeSlots.length === 0) {
      toast({
        title: "No time slots selected",
        description: "Please select at least one time slot when you're available.",
        variant: "destructive",
      });
      return;
    }
    
    // Trigger confetti before submitting
    triggerSubmitConfetti();
    
    // Short delay to allow confetti to be visible before navigation
    setTimeout(() => {
      submitAvailability.mutate();
    }, 800);
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="text-center mb-4">
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto mb-2" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
          
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
        
        <div className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !meetingData || !participantId) {
    return (
      <Card className="w-full p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {!participantId 
              ? "Missing participant information. Please join the meeting first." 
              : "Could not load meeting data. Please check the URL and try again."
            }
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(`/join/${params.id}`)} className="mt-4">
          Go back to join
        </Button>
      </Card>
    );
  }

  if (!('meeting' in meetingData) || !('participants' in meetingData)) {
    return (
      <Card className="w-full p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Invalid meeting data format. Please try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(`/join/${params.id}`)} className="mt-4">
          Go back to join
        </Button>
      </Card>
    );
  }

  const { meeting } = meetingData;
  const participant = meetingData.participants.find(
    p => p.id === parseInt(participantId || "0")
  );
  
  if (!participant) {
    return (
      <Card className="w-full p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Participant not found. Please join the meeting again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(`/join/${params.id}`)} className="mt-4">
          Go back to join
        </Button>
      </Card>
    );
  }
  
  const dateRange = formatDateRange(meeting.startDate, meeting.endDate);

  return (
    <Card className="w-full">
      <div className="p-6 border-b border-gray-200">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/90 text-transparent bg-clip-text">{meeting.title}</h1>
          <p className="text-gray-600">Organized by: {meeting.organizer}</p>
          <p className="text-gray-600">{dateRange}</p>
        </div>
        
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tap </span> the time slots when you're available. Your icon will appear next to the organizer's crown.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Selected time slots summary */}
      <div className="px-6 pb-4" ref={slotClickRef}>
        <h2 className="text-xl font-medium text-primary mb-4">Your Selected Time Slots</h2>
        
        {selectedTimeSlots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {Object.entries(groupedTimeSlots).map(([date, times]) => {
              const dayColor = getDayColor(date);
              const weekday = formatDateToWeekday(date);
              
              return times.map((time, timeIndex) => (
                <div 
                  key={`${date}-${time}-${timeIndex}`}
                  className="relative group overflow-hidden rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <div className="absolute top-0 left-0 h-full w-1.5" style={{ backgroundColor: dayColor }}></div>
                  <div className="p-3 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg" style={{ color: dayColor }}>{weekday}</p>
                        <p className="text-gray-700">{formatTimeForDisplay(time)}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(date).toLocaleDateString()}</p>
                      </div>
                      
                      <div 
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium participant-icon"
                        title={participant.name}
                      >
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center">
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                        Available
                      </Badge>
                    </div>
                  </div>
                </div>
              ));
            })}
          </div>
        ) : (
          <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center mb-6">
            <p className="text-gray-500">No time slots selected yet. Please select your availability from the calendar below.</p>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto px-6 py-2">
        <h2 className="text-xl font-medium text-primary mb-4">Meeting Calendar</h2>
        <ParticipantCalendarGrid 
          meeting={meeting} 
          timeSlots={timeSlots} 
          onTimeSlotClick={toggleTimeSlot} 
        />
      </div>
      
      <div className="fixed inset-x-0 bottom-0 bg-white p-4 border-t border-gray-200 shadow-md md:position-static md:p-6 md:shadow-none md:border-t-0 md:mt-3">
        <div className="max-w-2xl mx-auto flex flex-col-reverse md:flex-row md:justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={clearSelections}
            className="w-full md:w-auto"
          >
            Clear Selection
          </Button>
          <Button 
            ref={submitButtonRef}
            onClick={handleSubmit}
            className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/90"
            disabled={submitAvailability.isPending || selectedTimeSlots.length === 0}
          >
            <Zap className="h-4 w-4 mr-2" />
            {submitAvailability.isPending
              ? "Submitting..."
              : "Submit Availability"
            }
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ParticipantView;
