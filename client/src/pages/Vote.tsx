import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMeeting, submitVote } from "@/lib/api";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";
import { format, parseISO, isAfter } from "date-fns";

interface TimeSlot {
  id: string;
  day: string;
  hour: string;
  votes: number;
}

interface Meeting {
  id: string;
  title: string;
  timeSlots: TimeSlot[];
  votingDeadline: string;
  isVotingClosed: boolean;
}

export default function Vote() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVotingClosed, setIsVotingClosed] = useState(false);

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const meetingData = await getMeeting(meetingId!);
        setMeeting(meetingData);
        
        // Check if voting is closed based on deadline
        const deadlineDate = parseISO(meetingData.votingDeadline);
        const now = new Date();
        const isDeadlinePassed = isAfter(now, deadlineDate);
        
        setIsVotingClosed(isDeadlinePassed || meetingData.isVotingClosed);
        
        // Check if user has already voted
        const votedKey = `voted-${meetingId}`;
        const hasVotedBefore = localStorage.getItem(votedKey) === "true";
        setHasVoted(hasVotedBefore);
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
    if (isVotingClosed || hasVoted) return;
    
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      return [...prev, slotId];
    });
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0 || isVotingClosed || hasVoted) return;

    setIsSubmitting(true);
    try {
      await submitVote(meetingId!, selectedSlots);
      
      // Save to localStorage to prevent duplicate votes
      localStorage.setItem(`voted-${meetingId}`, "true");
      setHasVoted(true);
      
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

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Meeting Not Found</h1>
          <p className="text-gray-600">The meeting you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const deadlineDate = parseISO(meeting.votingDeadline);
  const formattedDeadline = format(deadlineDate, "MMMM d, yyyy 'at' h:mm a");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-indigo-50"
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <SlotKingLogo />
        </div>

        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {meeting.title}
        </h1>
        
        <p className="text-gray-600 mb-6">
          Voting deadline: <span className="font-medium text-gray-900">{formattedDeadline}</span>
        </p>

        {(isVotingClosed || hasVoted) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {isVotingClosed 
                    ? "Voting is now closed. Here are the results:" 
                    : "You have already voted. Here are the current results:"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {meeting.timeSlots.map((slot) => (
            <motion.button
              key={slot.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSlotClick(slot.id)}
              disabled={isVotingClosed || hasVoted}
              className={`w-full p-4 rounded-lg border transition-colors ${
                selectedSlots.includes(slot.id)
                  ? "bg-indigo-500 text-white border-indigo-600"
                  : "bg-white hover:bg-indigo-50 border-slate-200"
              } ${(isVotingClosed || hasVoted) ? "cursor-default" : ""}`}
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

        {!isVotingClosed && !hasVoted && (
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
        )}

        {isVotingClosed && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Voting is now closed. The meeting organizer will be notified of the results.
            </p>
          </div>
        )}
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
          showToast ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        Your vote has been submitted!
      </div>
    </motion.div>
  );
} 