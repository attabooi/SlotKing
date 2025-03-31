import React from 'react';

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
      {/* Calendar Base */}
      <rect x="15" y="25" width="70" height="70" rx="8" fill="#333333" stroke="#666666" strokeWidth="2" />
      
      {/* Calendar Top */}
      <rect x="15" y="25" width="70" height="15" rx="5" fill="#444444" stroke="#666666" strokeWidth="2" />
      
      {/* Calendar Grid Lines */}
      <line x1="15" y1="40" x2="85" y2="40" stroke="#666666" strokeWidth="2" />
      
      {/* Selected Date Highlight */}
      <rect x="62" y="67" width="22" height="13" rx="2" fill="#FFD700" fillOpacity="0.7" />
      
      {/* Crown */}
      <path 
        d="M50 5L60 20H70L65 35H35L30 20H40L50 5Z" 
        fill="#FFD700" 
        stroke="#CD7F32" 
        strokeWidth="1" 
      />
      
      {/* Crown Jewels */}
      <circle cx="40" cy="20" r="3" fill="#FF0000" />
      <circle cx="50" cy="15" r="3" fill="#0000FF" />
      <circle cx="60" cy="20" r="3" fill="#00FF00" />
    </svg>
  );
};

export default SlotKingLogo;