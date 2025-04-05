import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeSlot {
  day: number;
  hour: number;
  groupId: string;
}

interface TimeSlotGroup {
  day: number;
  startHour: number;
  endHour: number;
  slots: TimeSlot[];
  groupId: string;
}

interface SimpleWeeklyCalendarProps {
  selectedTimeSlots: TimeSlot[];
  onSelectTimeSlots: (slots: Array<{ day: number; hour: number }>, isAddOperation: boolean) => void;
  onDeleteTimeSlot: (day: number, hour: number) => void;
}

const SimpleWeeklyCalendar: React.FC<SimpleWeeklyCalendarProps> = ({
  selectedTimeSlots,
      onSelectTimeSlots,
      onDeleteTimeSlot,
}) => {
  // 기본 상태
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
      const today = new Date();
      return startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
    });
  const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
  const [tempSelection, setTempSelection] = useState<Array<{ day: number; hour: number }>>([]);

  // 그룹화된 시간대 계산
  const groupedSlots = useMemo(() => {
    const groups: TimeSlotGroup[] = [];
    
    // 요일별, groupId별로 슬롯 그룹화
    const slotsByDayAndGroup = selectedTimeSlots.reduce((acc, slot) => {
      const key = `${slot.day}-${slot.groupId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    // 각 그룹별로 처리
    Object.entries(slotsByDayAndGroup).forEach(([key, groupSlots]) => {
      if (groupSlots.length === 0) return;

      // 시간순 정렬
      const sortedSlots = groupSlots.sort((a, b) => a.hour - b.hour);
      
      // 그룹 생성
      const group: TimeSlotGroup = {
        day: sortedSlots[0].day,
        startHour: sortedSlots[0].hour,
        endHour: sortedSlots[sortedSlots.length - 1].hour,
        slots: sortedSlots,
        groupId: sortedSlots[0].groupId
      };
      
      groups.push(group);
    });

    return groups;
  }, [selectedTimeSlots]);

  // 기본 데이터
    const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
  // 드래그 중 텍스트 선택 방지
    useEffect(() => {
      if (!isDragging) return;
      
      const handleDisableSelect = (e: Event) => {
        e.preventDefault();
      };
      
      document.addEventListener('selectstart', handleDisableSelect);
    return () => document.removeEventListener('selectstart', handleDisableSelect);
    }, [isDragging]);
    
  // 마우스 이벤트 핸들러
    const handleMouseDown = (day: number, hour: number) => {
      setIsDragging(true);
      setDragStart({ day, hour });
    setTempSelection([{ day, hour }]);
    };
    
    const handleMouseOver = (day: number, hour: number) => {
    if (!isDragging || !dragStart) return;
        
        const startDay = Math.min(dragStart.day, day);
        const endDay = Math.max(dragStart.day, day);
        const startHour = Math.min(dragStart.hour, hour);
        const endHour = Math.max(dragStart.hour, hour);
        
    const newSelection = [];
        for (let d = startDay; d <= endDay; d++) {
          for (let h = startHour; h <= endHour; h++) {
        newSelection.push({ day: d, hour: h });
      }
    }
    setTempSelection(newSelection);
  };

  const handleMouseUp = () => {
    if (isDragging && tempSelection.length > 0) {
      onSelectTimeSlots(tempSelection, true);
    }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    setTempSelection([]);
  };

  // 주 이동
  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // 슬롯 상태 확인
  const isSelected = (day: number, hour: number) =>
    selectedTimeSlots.some(slot => slot.day === day && slot.hour === hour);

  const isInTempSelection = (day: number, hour: number) =>
    tempSelection.some(slot => slot.day === day && slot.hour === hour);

  // 그룹에서 시작 슬롯인지 확인
  const isGroupStartSlot = (day: number, hour: number) => {
    return groupedSlots.some(group => 
      group.day === day && group.startHour === hour
    );
  };

  // 슬롯이 속한 그룹 찾기
  const findSlotGroup = (day: number, hour: number): TimeSlotGroup | null => {
    return groupedSlots.find(group => 
      group.day === day && 
      hour >= group.startHour && 
      hour <= group.endHour
    ) || null;
  };

  // 그룹 삭제 처리
  const handleGroupDelete = (group: TimeSlotGroup) => {
    for (let hour = group.startHour; hour <= group.endHour; hour++) {
      onDeleteTimeSlot(group.day, hour);
    }
  };

  // 주 범위 텍스트
    const weekRangeText = `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`;
    
  // 특정 시간대가 그룹의 시작 시간인지 확인
  const isGroupStartTime = useCallback((day: number, hour: number) => {
    return groupedSlots.some(group => 
      group.day === day && group.startHour === hour
    );
  }, [groupedSlots]);
    
    return (
      <div className="w-full overflow-auto">
      <div className="bg-primary/5 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
          <div>
            <span className="text-primary font-medium">💡 Tip:</span> Click and drag to select multiple time slots.
          </div>
        </div>
        
      {/* 주 이동 */}
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
          </div>
          
          <div className="text-sm font-medium">{weekRangeText}</div>
        </div>
        
      {/* 달력 그리드 */}
      <div className="border rounded-lg">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted/50">
          <div className="p-2 border-b border-r border-border/20"></div>
          {days.map((day, index) => (
            <div
              key={index}
              className="p-2 text-center border-b border-r border-border/20 font-medium"
            >
              <div>{format(day, 'EEE')}</div>
              <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                  </div>
          ))}
          </div>
          
        {/* 시간 슬롯 */}
          <div>
          {hours.map((hour) => (
                <div 
                  key={`hour-${hour}`} 
              className="grid grid-cols-[60px_repeat(7,1fr)]"
                >
                  <div className="border-b border-r border-border/20 p-2 text-xs font-medium text-muted-foreground text-right pr-3">
                    {format(new Date(2023, 0, 1, hour), "h a")}
                  </div>
                  
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const isSlotSelected = isSelected(dayIndex, hour);
                const isInSelection = isInTempSelection(dayIndex, hour);
                const group = isSlotSelected ? findSlotGroup(dayIndex, hour) : null;
                const isStartSlot = group && isGroupStartSlot(dayIndex, hour);
                    
                    return (
                      <div 
                    key={`${dayIndex}-${hour}`}
                        className={cn(
                      "relative border-b border-r border-border/20",
                      "transition-colors duration-100",
                      isSlotSelected && "bg-primary/20",
                      isInSelection && "bg-primary/10",
                      "hover:bg-primary/5"
                        )}
                        onMouseDown={() => handleMouseDown(dayIndex, hour)}
                        onMouseOver={() => handleMouseOver(dayIndex, hour)}
                    onMouseUp={handleMouseUp}
                  >
                    {isStartSlot && group && (
                      <button
                        onClick={() => handleGroupDelete(group)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-muted/90 hover:bg-muted text-muted-foreground hover:text-destructive flex items-center justify-center z-10 shadow-sm"
                        title="Delete this time block"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                        )}
                      </div>
                    );
                  })}
                </div>
          ))}
        </div>
        </div>
      </div>
    );
};

export default SimpleWeeklyCalendar;