import { Participant } from "@shared/schema";
import { format } from "date-fns";

type ActivityFeedProps = {
  participants: Participant[];
};

const ActivityFeed = ({ participants }: ActivityFeedProps) => {
  // Sort participants by most recent first
  const sortedParticipants = [...participants].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Generate a random color based on participant name
  const getInitialColor = (name: string) => {
    const colors = [
      "bg-primary", "bg-green-500", "bg-purple-500", 
      "bg-orange-500", "bg-pink-500", "bg-blue-500"
    ];
    
    // Simple hash function
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  // Get user initials from name
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Format the timestamp to relative time (e.g., 5 minutes ago)
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(timestamp).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  if (participants.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        No participants have joined this meeting yet.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Activity</h2>
      <ul className="space-y-3">
        {sortedParticipants.map((participant) => {
          const color = getInitialColor(participant.name);
          const initials = getInitials(participant.name);
          const timestamp = formatTimestamp(participant.createdAt);
          
          return (
            <li key={participant.id} className="bg-gray-50 p-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center`}>
                    <span className="text-white text-sm font-medium">{initials}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">
                    {participant.name} joined the meeting
                  </p>
                  <p className="text-xs text-gray-500">{timestamp}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ActivityFeed;
