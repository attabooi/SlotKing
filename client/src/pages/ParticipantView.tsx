import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Meeting, TimeSlot } from "@shared/schema";
import { generateTimeSlots, formatDateRange } from "@/lib/date-utils";
import { useTimeSlots } from "@/hooks/useTimeSlots";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import ParticipantCalendarGrid from "@/components/ParticipantCalendarGrid";
import { CheckCircle, Info } from "lucide-react";

const ParticipantView = () => {
  const params = useParams<{ id: string }>();
  const searchParams = useSearch();
  const queryParams = new URLSearchParams(searchParams);
  const participantId = queryParams.get("participantId");
  
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch meeting data
  const { data: meetingData, isLoading, error } = useQuery({ 
    queryKey: [`/api/meetings/${params.id}`],
  });
  
  // Time slots state
  const { timeSlots, toggleTimeSlot, clearSelections, selectedTimeSlots } = useTimeSlots();
  
  // Initialize time slots when meeting data loads
  useEffect(() => {
    if (meetingData) {
      const { meeting } = meetingData;
      const generatedTimeSlots = generateTimeSlots(
        meeting.startDate, 
        meeting.endDate, 
        meeting.startTime,
        meeting.endTime, 
        meeting.timeSlotDuration
      );
      
      // Check if participant already submitted availability
      const participantAvailability = meetingData.availabilities.find(
        a => a.participantId === parseInt(participantId || "0")
      );
      
      // If participant has existing availability, mark those slots as selected
      if (participantAvailability) {
        generatedTimeSlots.forEach((slot, index) => {
          const slotKey = `${slot.date}-${slot.time}`;
          if (participantAvailability.timeSlots.includes(slotKey)) {
            generatedTimeSlots[index].selected = true;
          }
        });
      }
      
      // Set the time slots
      setTimeSlots(generatedTimeSlots);
    }
  }, [meetingData, participantId]);
  
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
  
  const handleSubmit = () => {
    if (selectedTimeSlots.length === 0) {
      toast({
        title: "No time slots selected",
        description: "Please select at least one time slot when you're available.",
        variant: "destructive",
      });
      return;
    }
    
    submitAvailability.mutate();
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

  const { meeting } = meetingData;
  const participant = meetingData.participants.find(
    p => p.id === parseInt(participantId)
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
          <h1 className="text-2xl font-bold text-gray-800">{meeting.title}</h1>
          <p className="text-gray-600">Organized by: {meeting.organizer}</p>
          <p className="text-gray-600">{dateRange}</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-indigo-700">
                Tap or click on the time slots when you're available. Selected slots will be highlighted.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto px-6 py-6">
        <ParticipantCalendarGrid 
          meeting={meeting} 
          timeSlots={timeSlots} 
          onTimeSlotClick={toggleTimeSlot} 
        />
      </div>
      
      <div className="fixed inset-x-0 bottom-0 bg-white p-4 border-t border-gray-200 shadow-md md:position-static md:p-6 md:shadow-none md:border-t-0 md:mt-6">
        <div className="max-w-2xl mx-auto flex flex-col-reverse md:flex-row md:justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={clearSelections}
            className="w-full md:w-auto"
          >
            Clear Selection
          </Button>
          <Button 
            onClick={handleSubmit}
            className="w-full md:w-auto"
            disabled={submitAvailability.isPending}
          >
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
