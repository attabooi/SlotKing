import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMeeting, submitVote, clearVotes } from "@/lib/api";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";
import { format, parseISO, isAfter, formatDistanceToNow, differenceInSeconds } from "date-fns";

interface TimeBlock {
  id: string;
  day: string;
  date: string;
  startHour: string;
  endHour: string;
}

interface Meeting {
  id: string;
  title: string;
  timeBlocks: TimeBlock[];
  votingDeadline: string;
  votes: { [slotId: string]: { [userId: string]: boolean } };
}

interface MeetingResponse {
  id: string;
  title: string;
  timeBlocks: TimeBlock[];
  votingDeadline: string;
  votes: { [slotId: string]: number };
}

export default function Vote() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [isVotingClosed, setIsVotingClosed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Get vote counts for a time block
  const getVoteCount = (blockId: string) => {
    if (!meeting?.votes) return 0;
    return Object.keys(meeting.votes[blockId] || {}).length;
  };

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const meetingData = await getMeeting(meetingId!);
        setMeeting(meetingData);
        
        // Check if voting is closed based on deadline
        const deadlineDate = parseISO(meetingData.votingDeadline);
        const now = new Date();
        const isDeadlinePassed = isAfter(now, deadlineDate);
        setIsVotingClosed(isDeadlinePassed);
        
        // Check if user has already voted
        const userId = localStorage.getItem('anonymousUserId');
        if (userId) {
          const userVotes = Object.entries(meetingData.votes)
            .filter(([_, voters]) => voters[userId])
            .map(([blockId]) => blockId);
          setSelectedSlots(userVotes);
          setHasVoted(userVotes.length > 0);
        }
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

  // Update countdown timer every second
  useEffect(() => {
    if (!meeting) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const deadline = parseISO(meeting.votingDeadline);
      
      if (isAfter(now, deadline)) {
        setIsVotingClosed(true);
        setTimeLeft("Voting has ended");
        return;
      }

      const secondsLeft = differenceInSeconds(deadline, now);
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000); // Update every second

    return () => clearInterval(timer);
  }, [meeting]);

  // Get time left color based on remaining time
  const getTimeLeftColor = () => {
    if (!meeting) return "text-indigo-600";
    
    const now = new Date();
    const deadline = parseISO(meeting.votingDeadline);
    const secondsLeft = differenceInSeconds(deadline, now);
    
    if (secondsLeft <= 60) return "text-red-600"; // 1분 이하
    if (secondsLeft <= 300) return "text-orange-600"; // 5분 이하
    if (secondsLeft <= 3600) return "text-yellow-600"; // 1시간 이하
    if (secondsLeft <= 86400) return "text-blue-600"; // 1일 이하
    return "text-indigo-600"; // 1일 초과
  };

  const handleSlotClick = (slotId: string) => {
    if (isVotingClosed) return;
    
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      return [...prev, slotId];
    });
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0 || isVotingClosed) return;

    setIsSubmitting(true);
    try {
      const updatedMeeting = await submitVote(meetingId!, selectedSlots);
      console.log("Updated meeting after vote:", updatedMeeting);
      
      // Ensure we have the updated votes object
      if (updatedMeeting && updatedMeeting.votes) {
        setMeeting(updatedMeeting);
        setHasVoted(true);
        
        setToastMessage("Your vote has been submitted!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Failed to submit vote:", error);
      setToastMessage("Failed to submit vote. Please try again.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteAgain = async () => {
    if (isVotingClosed) return;
    
    setIsSubmitting(true);
    try {
      // Clear votes from backend
      const updatedMeeting = await clearVotes(meetingId!);
      console.log("Updated meeting after clearing votes:", updatedMeeting);
      
      // Ensure we have the updated votes object
      if (updatedMeeting && updatedMeeting.votes) {
        setMeeting(updatedMeeting);
        setHasVoted(false);
        setSelectedSlots([]);
        
        setToastMessage("Previous votes cleared. You can now vote again!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Failed to clear votes:", error);
      setToastMessage("Failed to clear votes. Please try again.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
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
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-600">Voting Deadline</div>
            <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {formattedDeadline}
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 mr-2">Voting ends in</span>
              <span className={`text-sm font-bold ${getTimeLeftColor()}`}>
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        {(isVotingClosed || hasVoted) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex justify-between items-center w-full">
                <p className="text-sm text-yellow-700">
                  {isVotingClosed 
                    ? "Voting is now closed. Here are the results:" 
                    : "You have already voted. Here are the current results:"}
                </p>
                {!isVotingClosed && (
                  <button
                    onClick={handleVoteAgain}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Vote Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Array.isArray(meeting.timeBlocks) && meeting.timeBlocks.map((block) => (
            <motion.button
              key={block.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSlotClick(block.id)}
              disabled={isVotingClosed || hasVoted}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedSlots.includes(block.id)
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg"
                  : "bg-white hover:border-indigo-300 hover:shadow-md border-slate-200"
              } ${(isVotingClosed || hasVoted) ? "cursor-default opacity-75" : ""}`}
            >
              <div className="flex justify-between items-center">
                <div className="text-left space-y-1">
                  <div className="font-semibold text-lg flex items-center gap-2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {block.day}
                    </span>
                    <span className={selectedSlots.includes(block.id) ? "text-white" : "text-gray-600"}>
                      {block.startHour} - {block.endHour}
                    </span>
                  </div>
                  <div className={`text-sm ${selectedSlots.includes(block.id) ? "text-indigo-100" : "text-gray-500"}`}>
                    {getVoteCount(block.id)} {getVoteCount(block.id) === 1 ? "vote" : "votes"} so far
                  </div>
                </div>
                {selectedSlots.includes(block.id) && (
                  <div className="bg-white bg-opacity-20 p-2 rounded-full">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </motion.button>
          ))}

          {(!Array.isArray(meeting.timeBlocks) || meeting.timeBlocks.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500">No time blocks available for this meeting.</p>
            </div>
          )}
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
        {toastMessage}
      </div>
    </motion.div>
  );
}
 