import { cn } from "@/lib/utils";

type TimeSlotProps = {
  available: number;
  total: number;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
};

const TimeSlot = ({ available, total, className, onClick, selected }: TimeSlotProps) => {
  return (
    <div
      className={cn(
        "time-slot h-12 rounded-md border border-gray-200 flex items-center justify-center cursor-pointer",
        className,
        selected && "selected"
      )}
      onClick={onClick}
    >
      {total > 0 && (
        <span className="text-xs font-medium">
          {available}/{total}
        </span>
      )}
    </div>
  );
};

export default TimeSlot;
