import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from "lucide-react";

interface SlotKingLogoProps {
  className?: string;
}

export const SlotKingLogo: React.FC<SlotKingLogoProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/")}
      className={`flex items-center justify-center space-x-2 cursor-pointer ${className}`}
    >
      <Crown className="w-8 h-8 text-blue-500" />
      <span className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
        Murgle
      </span>
    </div>
  );
};