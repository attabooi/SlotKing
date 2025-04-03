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
    <>
      <style>{`
        @keyframes crownFloat {
          0% {
            transform: rotate(-12deg) translateY(0);
          }
          50% {
            transform: rotate(-8deg) translateY(-3px);
          }
          100% {
            transform: rotate(-12deg) translateY(0);
          }
        }

        .crown-float {
          animation: crownFloat 2s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }
      `}</style>
      <div
        className={cn(
          "calendar-button h-12 flex items-center justify-center",
          isOrganizer && "organizer",
          selected && "selected",
          className
        )}
        onClick={onClick}
      >
        {/* Crown icon for top voted slot - larger and more prominent */}
        {isOrganizer && available > 0 && (
          <div className="absolute -top-3 -right-3 z-20">
            <Crown className="h-8 w-8 text-amber-400 crown-float" />
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
              animationDelay: `${index * 0.1}s`
            }}
          >
            <span className="text-[8px] text-white font-medium">{participant.name.charAt(0)}</span>
          </div>
        ))}

        {/* Available/Total display */}
        {participants.length > 0 && (
          <span className={cn(
            "text-xs font-medium",
            available === participants.length ? "text-primary" : "text-gray-500"
          )}>
            {available}/{participants.length}
          </span>
        )}
      </div>
    </>
  );
};

export default TimeSlot;
