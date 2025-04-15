import React from 'react';
import { Link } from "react-router-dom";

interface SlotKingLogoProps {
  className?: string;
  size?: number;
}

const SlotKingLogo: React.FC<SlotKingLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calendar Base with Integrated Design */}
      <g transform="translate(10, 20)">
        {/* Calendar Outline */}
        <rect x="0" y="0" width="80" height="75" rx="8" fill="#333333" stroke="#666666" strokeWidth="2" />
        
        {/* Calendar Header */}
        <rect x="0" y="0" width="80" height="15" rx="4" fill="#444444" stroke="#666666" strokeWidth="2" />
        
        {/* Calendar Grid - Simple but recognizable */}
        <line x1="0" y1="15" x2="80" y2="15" stroke="#666666" strokeWidth="2" />
        <line x1="26.6" y1="15" x2="26.6" y2="75" stroke="#666666" strokeWidth="1" />
        <line x1="53.3" y1="15" x2="53.3" y2="75" stroke="#666666" strokeWidth="1" />
        <line x1="0" y1="35" x2="80" y2="35" stroke="#666666" strokeWidth="1" />
        <line x1="0" y1="55" x2="80" y2="55" stroke="#666666" strokeWidth="1" />
        
        {/* Selected Event Slot */}
        <rect x="54" y="36" width="25" height="18" rx="3" fill="#7B68EE" fillOpacity="0.7" />
      </g>
      
      {/* Crown - Larger and More Integrated */}
      <g transform="translate(50, 20) scale(1.2)">
        <path 
          d="M0 -15L10 0H20L15 15H-15L-20 0H-10L0 -15Z" 
          fill="url(#crown-gradient)" 
          stroke="#CD7F32" 
          strokeWidth="1.5" 
        />
        
        {/* Crown Jewels */}
        <circle cx="-10" cy="0" r="3" fill="#E53935" /> {/* Red */}
        <circle cx="0" cy="-8" r="3" fill="#5E35B1" /> {/* Purple */}
        <circle cx="10" cy="0" r="3" fill="#43A047" /> {/* Green */}
      </g>
      
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="crown-gradient" x1="0" y1="-15" x2="0" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD700" /> {/* Gold at top */}
          <stop offset="1" stopColor="#F9A825" /> {/* Darker gold at bottom */}
        </linearGradient>
      </defs>
    </svg>
  );
};

export default SlotKingLogo;