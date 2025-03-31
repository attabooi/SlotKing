import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Meeting, Participant, Availability } from "@shared/schema";
import { generateTimeSlots, formatDateRange } from "@/lib/date-utils";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarGrid from "@/components/CalendarGrid";
import WeeklyCalendarGrid from "@/components/WeeklyCalendarGrid";
import ActivityFeed from "@/components/ActivityFeed";
import { ClipboardCopy, Settings, Info } from "lucide-react";

const OrganizerView = () => {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("availability");
  const [bestTimeSlot, setBestTimeSlot] = useState<string | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Array<{ date: string; time: string }>>([]);
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

  const handleCopyLink = () => {
    const meetingUrl = `${window.location.origin}/join/${params.id}`;
    navigator.clipboard.writeText(meetingUrl);
    
    toast({
      title: "Link copied",
      description: "Meeting link copied to clipboard",
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
    meeting.startTime,
    meeting.endTime, 
    meeting.timeSlotDuration
  );
  
  // Process availabilities into a format for the calendar grid
  const processedTimeSlots = timeSlots.map(slot => {
    let availableCount = 0;
    
    availabilities.forEach(availability => {
      const slotKey = `${slot.date}-${slot.time}`;
      if ((availability.timeSlots as string[]).includes(slotKey)) {
        availableCount++;
      }
    });
    
    return {
      ...slot,
      available: availableCount,
      total: participants.length
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
