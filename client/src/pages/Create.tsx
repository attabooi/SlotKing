import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";

interface TimeSlot {
  day: string;
  hour: string;
}

export default function Create() {
  const navigate = useNavigate();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const hours = Array.from({ length: 13 }, (_, i) => `${i + 9}:00`);

  const handleSlotClick = (day: string, hour: string) => {
    setSelectedSlots((prev) => {
      const exists = prev.some(
        (slot) => slot.day === day && slot.hour === hour
      );
      if (exists) {
        return prev.filter(
          (slot) => !(slot.day === day && slot.hour === hour)
        );
      }
      return [...prev, { day, hour }];
    });
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0) return;

    setIsSubmitting(true);
    try {
      // TODO: API 호출로 변경
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // 임시로 123을 meetingId로 사용
      navigate("/vote/123");
    } catch (error) {
      console.error("Failed to create meeting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <SlotKingLogo />
        </div>

        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Select Available Time Slots
        </h1>

        <div className="grid grid-cols-8 gap-2">
          <div className="col-span-1" />
          {days.map((day) => (
            <div key={day} className="text-center font-bold">
              {day}
            </div>
          ))}
          {hours.map((hour) => (
            <>
              <div key={hour} className="text-right font-bold">
                {hour}
              </div>
              {days.map((day) => (
                <motion.button
                  key={`${day}-${hour}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSlotClick(day, hour)}
                  className={`p-2 border rounded transition-colors ${
                    selectedSlots.some(
                      (slot) => slot.day === day && slot.hour === hour
                    )
                      ? "bg-indigo-500 text-white border-indigo-600"
                      : "hover:bg-indigo-50 border-slate-200"
                  }`}
                />
              ))}
            </>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={selectedSlots.length === 0 || isSubmitting}
          className={`mt-8 w-full py-4 rounded-lg font-semibold text-lg shadow-lg transition-shadow ${
            selectedSlots.length === 0 || isSubmitting
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-xl"
          }`}
        >
          {isSubmitting ? "Creating..." : "Create Meeting"}
        </motion.button>
      </div>
    </div>
  );
} 