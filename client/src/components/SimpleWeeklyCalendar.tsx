import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface Participant {
  name: string;
  color: string;
  isHost?: boolean;
}

interface LanguageOption {
  name: string;
  code: string;
  flag: string;
}

interface SelectionGroup {
  id: string;
  slots: Array<{ day: number; hour: number }>;
  topSlot: { day: number; hour: number };
}

interface SimpleWeeklyCalendarProps {
  onSelectTimeSlots?: (selectedSlots: Array<{ day: number; hour: number }>) => void;
  onDeleteTimeSlot?: (day: number, hour: number) => void;
  userName?: string;
  isHost?: boolean;
  participants?: Participant[];
}

const SimpleWeeklyCalendar: React.FC<SimpleWeeklyCalendarProps> = ({ 
  onSelectTimeSlots,
  onDeleteTimeSlot,
  userName = 'User',
  isHost = false,
  participants = []
}) => {
  // State variables first
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isDragging, setIsDragging] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
  });
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: number; hour: number }>>([]);
  const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
  const [draggedSlots, setDraggedSlots] = useState<Array<{ day: number; hour: number }>>([]);
  
  // Available languages
  const languages: LanguageOption[] = [
    { name: 'English', code: 'en', flag: '🇺🇸' },
    { name: '한국어', code: 'ko', flag: '🇰🇷' },
    { name: '日本語', code: 'ja', flag: '🇯🇵' },
    { name: '中文', code: 'zh', flag: '🇨🇳' },
    { name: 'Español', code: 'es', flag: '🇪🇸' },
    { name: 'Français', code: 'fr', flag: '🇫🇷' },
  ];
  
  // Derived data
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Prevent text selection during drag
  useEffect(() => {
    const handleDisableSelect = (e: Event) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('selectstart', handleDisableSelect);
    
    return () => {
      document.removeEventListener('selectstart', handleDisableSelect);
    };
  }, [isDragging]);
  
  // Generate a color for the user based on their name
  const getUserColor = (name: string) => {
    const colors = [
      '#F87171', // red-400
      '#FB923C', // orange-400
      '#FBBF24', // amber-400
      '#4ADE80', // green-400
      '#60A5FA', // blue-400
      '#A78BFA', // violet-400
      '#F472B6', // pink-400
    ];
    
    // Simple hash function to get a consistent color for a name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Determine time of day for styling
  const getTimeOfDay = (hour: number) => {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
  };
  
  // Get background styles based on time of day
  const getBackgroundStyle = (hour: number) => {
    const timeOfDay = getTimeOfDay(hour);
    
    if (timeOfDay === 'morning') {
      return 'time-morning'; // Sunrise tones
    } else if (timeOfDay === 'afternoon') {
      return 'time-afternoon'; // Sunlight tones
    } else {
      return 'time-night'; // Night tones
    }
  };
  
  // User information
  const userColor = getUserColor(userName);
  const userInitial = userName.charAt(0).toUpperCase();
  
  // Handle mouse down on a cell
  const handleMouseDown = (day: number, hour: number) => {
    setIsDragging(true);
    setDragStart({ day, hour });
    setDragEnd({ day, hour });
    setDraggedSlots([{ day, hour }]);
  };
  
  // Handle mouse over during drag
  const handleMouseOver = (day: number, hour: number) => {
    if (isDragging && dragStart) {
      setDragEnd({ day, hour });
      
      // Calculate the selected range
      const startDay = Math.min(dragStart.day, day);
      const endDay = Math.max(dragStart.day, day);
      const startHour = Math.min(dragStart.hour, hour);
      const endHour = Math.max(dragStart.hour, hour);
      
      // Create array of dragged slots
      const newDraggedSlots = [];
      
      for (let d = startDay; d <= endDay; d++) {
        for (let h = startHour; h <= endHour; h++) {
          newDraggedSlots.push({ day: d, hour: h });
        }
      }
      
      setDraggedSlots(newDraggedSlots);
    }
  };
  
  // Handle mouse up to end drag
  const handleMouseUp = () => {
    if (isDragging && draggedSlots.length > 0) {
      // Add the dragged slots to the already selected slots (without duplicates)
      const newSelectedSlots = [...selectedSlots];
      
      draggedSlots.forEach(draggedSlot => {
        const alreadySelected = newSelectedSlots.some(
          slot => slot.day === draggedSlot.day && slot.hour === draggedSlot.hour
        );
        
        if (!alreadySelected) {
          newSelectedSlots.push(draggedSlot);
        }
      });
      
      // Update selected slots
      setSelectedSlots(newSelectedSlots);
      
      // Call the callback if provided
      if (onSelectTimeSlots) {
        onSelectTimeSlots(newSelectedSlots);
      }
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDraggedSlots([]);
  };
  
  // Handle delete slot
  const handleDeleteSlot = (e: React.MouseEvent, day: number, hour: number) => {
    e.stopPropagation();
    
    // Remove the slot from selected slots
    const newSelectedSlots = selectedSlots.filter(
      slot => !(slot.day === day && slot.hour === hour)
    );
    
    setSelectedSlots(newSelectedSlots);
    
    // Call the delete callback if provided
    if (onDeleteTimeSlot) {
      onDeleteTimeSlot(day, hour);
    } else if (onSelectTimeSlots) {
      onSelectTimeSlots(newSelectedSlots);
    }
  };
  
  // Check if a slot is in the current drag selection
  const isInDragSelection = (day: number, hour: number) => {
    return draggedSlots.some(slot => slot.day === day && slot.hour === hour);
  };
  
  // Check if a slot is selected
  const isSelected = (day: number, hour: number) => {
    return selectedSlots.some(slot => slot.day === day && slot.hour === hour);
  };
  
  // Week navigation
  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };
  
  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };
  
  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };
  
  // Add document-wide mouse up event listener
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      handleMouseUp();
    };
    
    document.addEventListener('mouseup', handleDocumentMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, dragStart, dragEnd, draggedSlots, selectedSlots]);
  
  // Format the week range for display
  const weekRangeText = `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`;
  
  // Mock participants data for demonstration
  const mockParticipants: Participant[] = participants.length > 0 ? participants : [
    { name: userName, color: userColor, isHost }
  ];
  
  // Group selected slots into contiguous groups
  const selectionGroups = useMemo(() => {
    if (selectedSlots.length === 0) return [];
    
    const getAdjacentSlots = (slot: { day: number; hour: number }, slots: Array<{ day: number; hour: number }>) => {
      const { day, hour } = slot;
      return slots.filter(s => 
        (s.day === day && (s.hour === hour - 1 || s.hour === hour + 1)) || 
        ((s.day === day - 1 || s.day === day + 1) && s.hour === hour)
      );
    };
    
    const visited = new Set<string>();
    const groups: SelectionGroup[] = [];
    
    // Helper function to convert slot to string key
    const slotKey = (slot: { day: number; hour: number }) => `${slot.day}-${slot.hour}`;
    
    // Find all groups using breadth-first search
    selectedSlots.forEach(slot => {
      const key = slotKey(slot);
      if (visited.has(key)) return;
      
      const group: SelectionGroup = {
        id: `group-${groups.length}`,
        slots: [],
        topSlot: slot // Will be updated if needed
      };
      
      const queue = [slot];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentKey = slotKey(current);
        
        if (visited.has(currentKey)) continue;
        
        visited.add(currentKey);
        group.slots.push(current);
        
        // Update topSlot if this is the topmost slot (lowest hour)
        if (current.hour < group.topSlot.hour || 
            (current.hour === group.topSlot.hour && current.day < group.topSlot.day)) {
          group.topSlot = current;
        }
        
        // Add all adjacent slots to the queue
        const adjacent = getAdjacentSlots(current, selectedSlots);
        adjacent.forEach(adj => {
          const adjKey = slotKey(adj);
          if (!visited.has(adjKey)) {
            queue.push(adj);
          }
        });
      }
      
      groups.push(group);
    });
    
    return groups;
  }, [selectedSlots]);
  
  // Function to check if a slot is the top slot of its group
  const isTopSlotOfGroup = (day: number, hour: number) => {
    return selectionGroups.some(group => 
      group.topSlot.day === day && group.topSlot.hour === hour
    );
  };
  
  // Find group for a slot
  const getSlotGroup = (day: number, hour: number) => {
    return selectionGroups.find(group => 
      group.slots.some(slot => slot.day === day && slot.hour === hour)
    );
  };
  
  return (
    <div className="w-full overflow-auto">
      <div className="bg-primary/5 rounded-lg p-3 mb-4 text-sm text-muted-foreground flex flex-col gap-2">
        <div>
          <span className="text-primary font-medium">💡 Tip:</span> Click and drag to select multiple time slots.
        </div>
        <div>
          <span className="text-primary font-medium">💡 Pro tip:</span> Selected slots will remain selected after dragging. Click (X) to remove a selection.
        </div>
      </div>
      
      {/* Week navigation and Language selection */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPreviousWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToCurrentWeek}
            className="text-xs h-8"
          >
            Today
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 ml-2 pl-2 pr-3 gap-1">
                <Globe className="h-3.5 w-3.5 mr-1" />
                <span className="mr-1">
                  {languages.find(lang => lang.code === selectedLanguage)?.flag}
                </span>
                <span className="text-xs">
                  {languages.find(lang => lang.code === selectedLanguage)?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {languages.map(language => (
                <DropdownMenuItem 
                  key={language.code}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    selectedLanguage === language.code && "bg-primary/10"
                  )}
                  onClick={() => setSelectedLanguage(language.code)}
                >
                  <span className="text-base">{language.flag}</span>
                  <span>{language.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="text-sm font-medium">{weekRangeText}</div>
      </div>
      
      <div className="min-w-[800px] border border-border/20 rounded-lg overflow-hidden">
        {/* Header row with days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted/30">
          <div className="border-b border-r border-border/20 p-2"></div>
          
          {days.map((day, index) => {
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={`day-${index}`} 
                className={cn(
                  "border-b border-r border-border/20 p-2 text-center",
                  isToday && "bg-primary/10"
                )}
              >
                <div className="text-sm font-medium">{format(day, "EEE")}</div>
                <div className={cn(
                  "text-xs text-muted-foreground",
                  isToday && "text-primary font-medium"
                )}>
                  {format(day, "MMM d")}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Time grid */}
        <div>
          {hours.map((hour) => {
            const timeOfDay = getTimeOfDay(hour);
            const bgStyle = getBackgroundStyle(hour);
            
            return (
              <div 
                key={`hour-${hour}`} 
                className={cn(
                  "grid grid-cols-[60px_repeat(7,1fr)]",
                  bgStyle
                )}
              >
                {/* Time label */}
                <div className="border-b border-r border-border/20 p-2 text-xs font-medium text-muted-foreground text-right pr-3">
                  {format(new Date(2023, 0, 1, hour), "h a")}
                </div>
                
                {/* Day cells */}
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const isInSelection = isInDragSelection(dayIndex, hour);
                  const isSlotSelected = isSelected(dayIndex, hour);
                  
                  return (
                    <div 
                      key={`cell-${dayIndex}-${hour}`} 
                      className={cn(
                        "border-b border-r border-border/20 h-12 relative transition-colors duration-150",
                        isInSelection && "bg-primary/15 hover:bg-primary/20",
                        isSlotSelected && isHost && "bg-primary/25 hover:bg-primary/30",
                        isSlotSelected && !isHost && "bg-secondary/25 hover:bg-secondary/30",
                        !isSlotSelected && !isInSelection && `hover:bg-muted/30 ${bgStyle}`,
                        isDragging && "cursor-pointer"
                      )}
                      onMouseDown={() => handleMouseDown(dayIndex, hour)}
                      onMouseOver={() => handleMouseOver(dayIndex, hour)}
                    >
                      {/* Icons for selected slots */}
                      {isSlotSelected && (
                        <>
                          {/* Close button */}
                          <button 
                            onClick={(e) => handleDeleteSlot(e, dayIndex, hour)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          
                          {/* Get the current cell's selection group (if any) */}
                          {isTopSlotOfGroup(dayIndex, hour) && (
                            <div className="absolute top-1 left-1 flex -space-x-1">
                              {mockParticipants.slice(0, 5).map((participant, index) => (
                                <div
                                  key={`p-${index}`}
                                  className="participant-icon w-5 h-5 flex items-center justify-center rounded-full border border-background/50 animate-in fade-in zoom-in duration-300"
                                  style={{
                                    backgroundColor: participant.color,
                                    zIndex: mockParticipants.length - index,
                                    animationDelay: `${index * 0.05}s`
                                  }}
                                  title={`${participant.name}${participant.isHost ? ' (Host)' : ''}`}
                                >
                                  {participant.isHost && (
                                    <span className="absolute -top-1.5 -right-1.5 text-[8px] host-crown">
                                      👑
                                    </span>
                                  )}
                                  <span className="text-[8px] font-medium text-white">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              ))}
                              
                              {mockParticipants.length > 5 && (
                                <div 
                                  className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[8px] border border-background/50"
                                  title={`${mockParticipants.length - 5} more participants`}
                                >
                                  +{mockParticipants.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Visual indicators for grouped and connected slots */}
                          {isSlotSelected && !isTopSlotOfGroup(dayIndex, hour) && (
                            <div className="absolute inset-0 group-indicator opacity-30 pointer-events-none"></div>
                          )}
                          
                          {/* Show connection indicators based on adjacent selected slots */}
                          {isSlotSelected && (
                            <>
                              {/* Check if there's a selected slot above */}
                              {selectedSlots.some(slot => slot.day === dayIndex && slot.hour === hour - 1) && (
                                <div className="absolute inset-x-0 top-0 h-1/4 slot-connected-top pointer-events-none"></div>
                              )}
                              
                              {/* Check if there's a selected slot below */}
                              {selectedSlots.some(slot => slot.day === dayIndex && slot.hour === hour + 1) && (
                                <div className="absolute inset-x-0 bottom-0 h-1/4 slot-connected-bottom pointer-events-none"></div>
                              )}
                              
                              {/* Check if there's a selected slot to the left */}
                              {selectedSlots.some(slot => slot.day === dayIndex - 1 && slot.hour === hour) && (
                                <div className="absolute inset-y-0 left-0 w-1/4 slot-connected-left pointer-events-none"></div>
                              )}
                              
                              {/* Check if there's a selected slot to the right */}
                              {selectedSlots.some(slot => slot.day === dayIndex + 1 && slot.hour === hour) && (
                                <div className="absolute inset-y-0 right-0 w-1/4 slot-connected-right pointer-events-none"></div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SimpleWeeklyCalendar;