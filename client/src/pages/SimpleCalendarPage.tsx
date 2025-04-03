import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { Trash2 } from 'lucide-react';
import SimpleWeeklyCalendar from '@/components/SimpleWeeklyCalendar';
import MeetingSummary from '@/components/MeetingSummary';
import { useTimeSlots } from '@/hooks/useTimeSlots';

interface TimeSlot {
  day: number;
  hour: number;
  groupId: string; // 각 드래그 동작마다 고유한 ID
}

interface TimeSlotGroup {
  day: number;
  startHour: number;
  endHour: number;
  slots: TimeSlot[];
  groupId: string;
}

export default function SimpleCalendarPage() {
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const { timeSlots, deleteTimeSlot } = useTimeSlots();
  const [nextGroupId, setNextGroupId] = useState(1);

  // 연속된 시간대를 그룹으로 묶는 로직
  const groupedSlots = useMemo(() => {
    const groups: TimeSlotGroup[] = [];
    
    // 요일별, groupId별로 슬롯 그룹화
    const slotsByDayAndGroup = selectedSlots.reduce((acc, slot) => {
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

    // 시작 시간 순으로 정렬
    return groups.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.startHour - b.startHour;
    });
  }, [selectedSlots]);

  const handleSelectTimeSlots = (slots: Array<{ day: number; hour: number }>, isAddOperation: boolean) => {
    if (isAddOperation) {
      // 새로운 그룹 ID 생성
      const groupId = `group-${nextGroupId}`;
      setNextGroupId(prev => prev + 1);

      setSelectedSlots(prev => {
        // 새로운 슬롯에 그룹 ID 추가
        const newSlots = slots.map(slot => ({
          ...slot,
          groupId
        }));

        // 중복 제거하여 추가
        const existingSlots = [...prev];
        newSlots.forEach(newSlot => {
          if (!existingSlots.some(s => s.day === newSlot.day && s.hour === newSlot.hour)) {
            existingSlots.push(newSlot);
          }
        });
        return existingSlots;
      });
    } else {
      // 전체 교체 시에는 새로운 그룹 ID 부여
      const groupId = `group-${nextGroupId}`;
      setNextGroupId(prev => prev + 1);
      setSelectedSlots(slots.map(slot => ({ ...slot, groupId })));
    }
  };

  const handleDeleteTimeSlot = async (day: number, hour: number) => {
    // 삭제할 그룹 찾기
    const groupToDelete = groupedSlots.find(group => 
      group.day === day && 
      hour >= group.startHour && 
      hour <= group.endHour &&
      group.slots.some(slot => slot.hour === hour)
    );

    if (!groupToDelete) return;

    // 1. 로컬 상태에서 그룹 전체 삭제
    setSelectedSlots(prev => 
      prev.filter(slot => slot.groupId !== groupToDelete.groupId)
    );

    // 2. 서버에서 그룹 전체 삭제
    const deletePromises = groupToDelete.slots.map(slot => {
      const currentDate = new Date();
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const dayDate = addDays(weekStart, slot.day);
      const slotDate = format(dayDate, 'yyyy-MM-dd');
      const slotTime = format(new Date(0, 0, 0, slot.hour), 'HH:mm');
      
      const slotToDelete = timeSlots.find(
        ts => ts.date === slotDate && ts.time === slotTime
      );
      
      if (slotToDelete?.id) {
        return deleteTimeSlot(slotToDelete.id);
      }
      return Promise.resolve();
    });

    await Promise.all(deletePromises);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Schedule a Meeting</h1>
        <p className="text-gray-600">Select available time slots for your meeting.</p>
      </div>

      {/* Meeting Summary */}
      <div className="mb-8">
        <MeetingSummary
          selectedSlots={selectedSlots}
        />
      </div>

      {/* Calendar Grid */}
      <SimpleWeeklyCalendar
        selectedTimeSlots={selectedSlots}
        onSelectTimeSlots={handleSelectTimeSlots}
        onDeleteTimeSlot={handleDeleteTimeSlot}
      />

      {/* Available Time Slots */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Available Time Slots</h2>
        <div className="space-y-4">
          {groupedSlots.map((group) => (
            <div
              key={group.groupId}
              className="flex items-center justify-between bg-white p-4 rounded-lg shadow"
            >
              <div>
                <p className="font-medium">
                  {format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), group.day), 'EEEE')}
                </p>
                <p className="text-gray-600">
                  {format(new Date(0, 0, 0, group.startHour), 'h:mm a')} - {format(new Date(0, 0, 0, group.endHour + 1), 'h:mm a')}
                </p>
              </div>
              <button
                onClick={() => handleDeleteTimeSlot(group.day, group.startHour)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}