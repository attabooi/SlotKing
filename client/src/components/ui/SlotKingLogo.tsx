import { Crown } from "lucide-react";

export function SlotKingLogo() {
  return (
    <div className="flex items-center gap-2">
      <Crown className="w-8 h-8 text-indigo-500" />
      <span className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
        SlotKing
      </span>
    </div>
  );
} 