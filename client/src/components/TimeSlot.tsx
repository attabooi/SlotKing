import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

type TimeSlotProps = {
  available: number;
  total: number;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  isOrganizer?: boolean;
  participants?: { name: string; color: string }[];
  showParticipants?: boolean;
};

const TimeSlot = ({ 
  available, 
  total, 
  className, 
  onClick, 
  selected, 
  isOrganizer = false,
  participants = [],
  showParticipants = false
}: TimeSlotProps) => {
  // Get color class based on availability percentage if total > 0
  const getColorClass = () => {
    if (total === 0) return "bg-white";
    const percentage = (available / total) * 100;
    if (percentage === 100) return "bg-primary/15";
    if (percentage >= 75) return "bg-primary/10";
    if (percentage >= 50) return "bg-amber-50";
    if (percentage > 0) return "bg-red-50";
    return "bg-white";
  };

  return (
    <div
      className={cn(
        "calendar-button h-12 flex items-center justify-center",
        isOrganizer && "organizer",
        selected && "selected",
        className
      )}
      onClick={onClick}
    >
      {/* Crown icon for organizer */}
      {isOrganizer && (
        <div className="crown-icon">
          <Crown className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      {/* Participant avatars - pop in with animation */}
      {showParticipants && participants.map((participant, index) => (
        <div 
          key={`participant-${index}`}
          className="participant-icon"
          style={{
            top: `${-8 + (index * 4)}px`,
            left: `${12 + (index * 12)}px`,
            backgroundColor: participant.color,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            // Add a delay to the animation based on index
            animationDelay: `${index * 0.1}s`
          }}
        >
          <span className="text-[8px] text-white font-medium">{participant.name.charAt(0)}</span>
        </div>
      ))}

      {/* Available/Total display */}
      {total > 0 && (
        <span className={cn(
          "text-xs font-medium",
          available === total ? "text-primary" : "text-gray-500"
        )}>
          {available}/{total}
        </span>
      )}
    </div>
  );
};

export default TimeSlot;
