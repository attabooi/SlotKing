import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMeeting, submitVote } from "@/lib/api";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";

interface TimeSlot {
  id: string;
  day: string;
  hour: string;
  votes: number;
}

export default function Vote() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const meeting = await getMeeting(meetingId!);
        setTimeSlots(meeting.timeSlots);
      } catch (error) {
        console.error("Failed to fetch meeting:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (meetingId) {
      fetchMeeting();
    }
  }, [meetingId]);

  const handleSlotClick = (slotId: string) => {
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      return [...prev, slotId];
    });
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0) return;

    setIsSubmitting(true);
    try {
      await submitVote(meetingId!, selectedSlots);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Failed to submit vote:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <SlotKingLogo />
        </div>

        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Vote for Your Preferred Time Slots
        </h1>

        <div className="space-y-4">
          {timeSlots.map((slot) => (
            <motion.button
              key={slot.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSlotClick(slot.id)}
              className={`w-full p-4 rounded-lg border transition-colors ${
                selectedSlots.includes(slot.id)
                  ? "bg-indigo-500 text-white border-indigo-600"
                  : "bg-white hover:bg-indigo-50 border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="font-semibold">
                    {slot.day}요일 {slot.hour}
                  </div>
                  <div className="text-sm opacity-75">
                    {slot.votes} votes so far
                  </div>
                </div>
                {selectedSlots.includes(slot.id) && (
                  <div className="text-white">✓</div>
                )}
              </div>
            </motion.button>
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
          {isSubmitting ? "Submitting..." : "Submit Vote"}
        </motion.button>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
          showToast ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        Your vote has been submitted!
      </div>
    </div>
  );
} 