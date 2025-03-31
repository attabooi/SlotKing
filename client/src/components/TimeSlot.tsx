import { cn } from "@/lib/utils";

type TimeSlotProps = {
  available: number;
  total: number;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
};

const TimeSlot = ({ available, total, className, onClick, selected }: TimeSlotProps) => {
  // Get color class based on availability percentage if total > 0
  const getColorClass = () => {
    if (total === 0) return "";
    const percentage = (available / total) * 100;
    if (percentage === 100) return "bg-gradient-to-br from-green-100 to-green-200 shadow-inner";
    if (percentage >= 75) return "bg-gradient-to-br from-green-50 to-green-100 shadow-inner";
    if (percentage >= 50) return "bg-gradient-to-br from-amber-50 to-amber-100 shadow-inner";
    if (percentage > 0) return "bg-gradient-to-br from-red-50 to-red-100 shadow-inner";
    return "";
  };

  return (
    <div
      className={cn(
        "time-slot-reddit h-12 flex items-center justify-center",
        getColorClass(),
        selected && "selected",
        className
      )}
      onClick={onClick}
    >
      {total > 0 && (
        <span className={cn(
          "text-xs font-medium",
          available === total ? "text-green-700" : "text-gray-700"
        )}>
          {available}/{total}
        </span>
      )}
    </div>
  );
};

export default TimeSlot;
