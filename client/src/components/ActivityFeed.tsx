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
  
  // Generate avatar background based on participant name
  const getAvatarStyle = (name: string) => {
    // Reddit-like avatar colors
    const colors = [
      "bg-gradient-to-br from-orange-400 to-red-500",
      "bg-gradient-to-br from-blue-400 to-blue-600",
      "bg-gradient-to-br from-green-400 to-green-600",
      "bg-gradient-to-br from-yellow-400 to-yellow-600",
      "bg-gradient-to-br from-purple-400 to-purple-600",
      "bg-gradient-to-br from-pink-400 to-pink-600"
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
      <div className="text-center py-10 text-gray-500 bg-white border rounded-md p-6">
        <p className="text-gray-400 mb-2">No participants yet</p>
        <p className="text-sm">Share the tab link with others to start collecting availability</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-primary mb-4">Participant Activity</h2>
      <div className="bg-white border rounded-md">
        <ul className="divide-y divide-gray-100">
          {sortedParticipants.map((participant) => {
            const avatarStyle = getAvatarStyle(participant.name);
            const initials = getInitials(participant.name);
            const timestamp = formatTimestamp(participant.createdAt);
            
            return (
              <li key={participant.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full ${avatarStyle} shadow-sm flex items-center justify-center`}>
                      <span className="text-white text-sm font-medium">{initials}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {participant.name}
                      </p>
                      <p className="text-xs text-gray-500">{timestamp}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      joined the tab
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ActivityFeed;
