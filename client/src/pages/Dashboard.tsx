import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Clock, 
  CalendarCheck, 
  Check, 
  Plus, 
  Crown, 
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Meeting, Participant, Availability } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDateRange } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface MeetingWithStats extends Meeting {
  participants: number;
  topSlot: string | null;
  hasVoted: boolean;
  daysLeft: number;
  description?: string; // Make description optional for compatibility
}

const Dashboard: React.FC = () => {
  const [, navigate] = useLocation();
  
  // Fetch user's active meetings
  const { data: meetings, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard'],
    // Using the default query function from queryClient
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json() as MeetingWithStats[];
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // For development - return mock data if API isn't implemented yet
        // In a real app, we would handle this more gracefully with proper error UI
        return mockMeetings;
      }
    }
  });
  
  // This would be set by user auth in a real app
  const currentUserId = 1;
  
  // Function to calculate days left for voting
  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Function to handle navigation to meeting detail
  const handleMeetingClick = (meetingId: string) => {
    navigate(`/meeting/${meetingId}`);
  };

  // Function to create a new meeting
  const handleCreateMeeting = () => {
    navigate('/create');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 text-transparent bg-clip-text">Your Meetings</h1>
          <p className="text-muted-foreground mt-1">Organize and schedule your group meetings</p>
        </div>
        
        <Button 
          onClick={handleCreateMeeting}
          className="mt-4 md:mt-0 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Meeting
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6 h-56 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-6 w-1/4"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-medium mb-2">Unable to load your meetings</h2>
          <p className="text-muted-foreground">Please try again later or create a new meeting.</p>
        </div>
      ) : meetings && meetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map(meeting => (
            <div 
              key={meeting.id} 
              className="group cursor-pointer" 
              onClick={() => handleMeetingClick(meeting.uniqueId)}
            >
              <div className={cn(
                "relative p-6 rounded-lg shadow-md border-l-4 bg-amber-50 dark:bg-amber-900/10 transition-all",
                "hover:shadow-lg transform hover:-translate-y-1 duration-200",
                "border-l-amber-400 rotate-[0.5deg]",
                meeting.hasVoted ? "border-l-green-400" : "border-l-amber-400"
              )}>
                {/* Meeting Title and Date */}
                <h2 className="text-xl font-bold mb-1 pr-6">{meeting.title}</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {formatDateRange(meeting.startDate, meeting.endDate)}
                </p>
                
                {/* Status Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Voting Status */}
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium flex items-center",
                    meeting.hasVoted 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  )}>
                    {meeting.hasVoted 
                      ? <><Check className="h-3 w-3 mr-1" /> Voted</> 
                      : <><X className="h-3 w-3 mr-1" /> Not Voted</>}
                  </span>
                  
                  {/* Days Left */}
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {meeting.daysLeft > 0 
                      ? `${meeting.daysLeft} day${meeting.daysLeft !== 1 ? 's' : ''} left` 
                      : 'Voting ended'}
                  </span>
                  
                  {/* Participant Count */}
                  <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium flex items-center">
                    <CalendarCheck className="h-3 w-3 mr-1" />
                    {meeting.participants} participant{meeting.participants !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Top Slot (if available) */}
                {meeting.topSlot && (
                  <div className="relative bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="absolute -top-2 -right-2">
                      <Crown className="h-5 w-5 text-yellow-500 drop-shadow-md" />
                    </div>
                    <p className="text-sm font-medium">Top Pick:</p>
                    <p className="text-sm text-primary">{meeting.topSlot}</p>
                  </div>
                )}
                
                {/* Pin effect */}
                <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-primary/80 shadow-md z-10"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <h2 className="text-xl font-medium mb-2">No meetings found</h2>
          <p className="text-muted-foreground mb-6">Create your first meeting to get started</p>
          <Button onClick={handleCreateMeeting}>
            <Plus className="h-4 w-4 mr-2" />
            Create Meeting
          </Button>
        </div>
      )}
    </div>
  );
};

// Mock data for development - this would come from the API in production
const mockMeetings: MeetingWithStats[] = [
  {
    id: 1,
    uniqueId: 'abc123',
    title: 'Weekly Team Sync',
    description: 'Discuss project progress and blockers',
    organizer: 'John Doe',
    organizerId: 1,
    startDate: '2025-04-05',
    endDate: '2025-04-12',
    startTime: 9,
    endTime: 17,
    timeSlotDuration: 30,
    createdAt: new Date(),
    participants: 8,
    topSlot: 'Monday, April 7 at 10:00 AM',
    hasVoted: true,
    daysLeft: 4
  },
  {
    id: 2,
    uniqueId: 'def456',
    title: 'Product Design Review',
    description: 'Review new feature designs',
    organizer: 'Jane Smith',
    organizerId: 2,
    startDate: '2025-04-10',
    endDate: '2025-04-15',
    startTime: 13,
    endTime: 18,
    timeSlotDuration: 60,
    createdAt: new Date(),
    participants: 5,
    topSlot: 'Wednesday, April 12 at 2:00 PM',
    hasVoted: false,
    daysLeft: 7
  },
  {
    id: 3,
    uniqueId: 'ghi789',
    title: 'Quarterly Planning',
    description: 'Set goals for Q2',
    organizer: 'John Doe',
    organizerId: 1,
    startDate: '2025-04-25',
    endDate: '2025-04-30',
    startTime: 10,
    endTime: 16,
    timeSlotDuration: 120,
    createdAt: new Date(),
    participants: 12,
    topSlot: null,
    hasVoted: false,
    daysLeft: 18
  }
];

export default Dashboard;