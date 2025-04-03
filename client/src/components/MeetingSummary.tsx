import React, { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface TimeSlotGroup {
  day: number;
  startHour: number;
  endHour: number;
}

interface MeetingSummaryProps {
  selectedSlots: Array<{ day: number; hour: number }>;
}

const MeetingSummary: React.FC<MeetingSummaryProps> = ({ selectedSlots }) => {
  // 연속된 시간대를 그룹으로 묶는 로직
  const groupedSlots = useMemo(() => {
    const groups: TimeSlotGroup[] = [];
    
    // 요일별로 슬롯 그룹화
    const slotsByDay = selectedSlots.reduce((acc, slot) => {
      if (!acc[slot.day]) {
        acc[slot.day] = [];
      }
      acc[slot.day].push(slot.hour);
      return acc;
    }, {} as Record<number, number[]>);

    // 각 요일의 연속된 시간대를 그룹으로 만들기
    Object.entries(slotsByDay).forEach(([day, hours]) => {
      const sortedHours = hours.sort((a, b) => a - b);
      let currentGroup: TimeSlotGroup | null = null;

      sortedHours.forEach((hour) => {
        if (!currentGroup) {
          currentGroup = { day: parseInt(day), startHour: hour, endHour: hour };
        } else if (hour === currentGroup.endHour + 1) {
          currentGroup.endHour = hour;
        } else {
          groups.push(currentGroup);
          currentGroup = { day: parseInt(day), startHour: hour, endHour: hour };
        }
      });

      if (currentGroup) {
        groups.push(currentGroup);
      }
    });

    return groups;
  }, [selectedSlots]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Meeting Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {selectedSlots.length === 0 ? (
            <p>No time slots selected</p>
          ) : (
            <div className="space-y-2">
              <p>{selectedSlots.length} time slots selected in {groupedSlots.length} blocks</p>
              <div className="space-y-1">
                {groupedSlots.map((group) => (
                  <p key={`${group.day}-${group.startHour}-${group.endHour}`}>
                    {format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), group.day), 'EEE')}{' '}
                    {format(new Date(0, 0, 0, group.startHour), 'h:mm a')} -{' '}
                    {format(new Date(0, 0, 0, group.endHour + 1), 'h:mm a')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeetingSummary; 