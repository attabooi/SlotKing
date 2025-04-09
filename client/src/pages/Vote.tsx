import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMeeting, submitVote, clearVotes } from "@/lib/api";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";
import { format, parseISO, isAfter, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { auth } from "@/lib/firebase";
import UserProfile from "@/components/UserProfile";

interface TimeBlock {
  id: string;
  day: string;
  date: string;
  startHour: string;
  endHour: string;
}

interface Voter {
  uid: string;
  displayName: string;
  photoURL: string;
}

interface Meeting {
  id: string;
  title: string;
  timeBlocks: TimeBlock[];
  votingDeadline: string;
  votes: { [slotId: string]: { [userId: string]: Voter } };
  creator?: {
    uid: string;
    displayName: string;
    photoURL: string;
  };
}

interface MeetingResponse {
  id: string;
  title: string;
  timeBlocks: TimeBlock[];
  votingDeadline: string;
  votes: { [slotId: string]: { [userId: string]: Voter } };
  creator: {
    uid: string;
    displayName: string;
    photoURL: string;
  };
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
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [selectedSlotVoters, setSelectedSlotVoters] = useState<Voter[]>([]);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{day: string, time: string} | null>(null);

  // Get vote counts for a time block
  const getVoteCount = (blockId: string) => {
    if (!meeting?.votes) return 0;
    return Object.keys(meeting.votes[blockId] || {}).length;
  };

  // Get voters for a time block
  const getVoters = (blockId: string): Voter[] => {
    if (!meeting?.votes || !meeting.votes[blockId]) return [];
    return Object.values(meeting.votes[blockId]);
  };

  // Get first few voters for display
  const getFirstFewVoters = (blockId: string, count: number = 3): Voter[] => {
    return getVoters(blockId).slice(0, count);
  };

  // Check if there are more voters than displayed
  const hasMoreVoters = (blockId: string, displayedCount: number = 3): boolean => {
    return getVoteCount(blockId) > displayedCount;
  };

  // Show voters modal
  const showVotersForSlot = (blockId: string, day: string, time: string) => {
    setSelectedSlotVoters(getVoters(blockId));
    setSelectedSlotInfo({ day, time });
    setShowVotersModal(true);
  };

  const getTimeLeftAnimation = () => {
    if (!meeting) return "";
  
    const now = new Date();
    const deadline = parseISO(meeting.votingDeadline);
    const secondsLeft = differenceInSeconds(deadline, now);
  
    if (secondsLeft <= 60) return "animate-pulse text-red-600"; // 🔴 1분 이하면 긴급
    if (secondsLeft <= 300) return "animate-bounce text-orange-600"; // 🟠 5분 이하
    if (secondsLeft <= 3600) return "animate-wiggle text-yellow-600"; // 🟡 1시간 이하
    return "text-indigo-600"; // 🔵 그 외
  };
  
  // Get vote count text
  const getVoteCountText = (blockId: string) => {
    const count = getVoteCount(blockId);
    return `${count} ${count === 1 ? "vote" : "votes"} so far`;
  };

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const meetingData = await getMeeting(meetingId!);
        
        // Ensure the meeting has the required structure
        if (!meetingData.votes) {
          meetingData.votes = {};
        }
        
        // Ensure creator exists
        if (!meetingData.creator) {
          meetingData.creator = {
            uid: 'unknown',
            displayName: 'Anonymous',
            photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`
          };
        }
        
        setMeeting(meetingData);

        // Check if voting is closed based on deadline
        const deadlineDate = parseISO(meetingData.votingDeadline);
        const now = new Date();
        const isDeadlinePassed = isAfter(now, deadlineDate);
        setIsVotingClosed(isDeadlinePassed);

        // Check if user has already voted
        const user = auth.currentUser;
        if (user) {
          const userVotes = Object.entries(meetingData.votes)
            .filter(([_, voters]) => voters[user.uid])
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
      const user = auth.currentUser;
      
      if (!user) {
        setToastMessage("로그인이 필요합니다.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setIsSubmitting(false);
        return;
      }
      
      const voterInfo = {
        uid: user.uid,
        displayName: user.displayName || '사용자',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.displayName || 'user'}`
      };
      
      const updatedMeeting = await submitVote(meetingId!, selectedSlots, voterInfo);
      console.log("Updated meeting after vote:", updatedMeeting);

      // Ensure we have the updated votes object
      if (updatedMeeting && updatedMeeting.votes) {
        // Ensure creator exists
        if (!updatedMeeting.creator) {
          updatedMeeting.creator = {
            uid: 'unknown',
            displayName: 'Anonymous',
            photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`
          };
        }
        
        // Update the entire meeting state with the new data
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
      const user = auth.currentUser;
      
      if (!user) {
        setToastMessage("로그인이 필요합니다.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setIsSubmitting(false);
        return;
      }
      
      // Clear votes from backend
      const updatedMeeting = await clearVotes(meetingId!, user.uid);
      console.log("Updated meeting after clearing votes:", updatedMeeting);

      // Ensure we have the updated votes object
      if (updatedMeeting && updatedMeeting.votes) {
        // Ensure creator exists
        if (!updatedMeeting.creator) {
          updatedMeeting.creator = {
            uid: 'unknown',
            displayName: 'Anonymous',
            photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`
          };
        }
        
        // Update the entire meeting state with the new data
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

  // Add WebSocket connection for real-time updates
  useEffect(() => {
    if (!meetingId) return;

    const ws = new WebSocket(`ws://localhost:3000/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'votes_updated' && data.data.meetingId === meetingId) {
        // Fetch the latest meeting data when votes are updated
        getMeeting(meetingId).then(updatedMeeting => {
          if (updatedMeeting) {
            // Ensure creator exists
            if (!updatedMeeting.creator) {
              updatedMeeting.creator = {
                uid: 'unknown',
                displayName: 'Anonymous',
                photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`
              };
            }
            
            setMeeting(updatedMeeting);
          }
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

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
        <div className="flex justify-between items-center mb-8">
          <SlotKingLogo />
          <UserProfile />
        </div>

        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {meeting.title}
        </h1>

        {/* Creator Info */}
        <div className="flex items-center mb-4">
          <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1 shadow-sm">
            <img 
              src={meeting.creator?.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${meeting.creator?.displayName || 'creator'}`} 
              alt="Creator" 
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-medium text-gray-700">
              Created by {meeting.creator?.displayName || 'Anonymous'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-600">Voting Deadline</div>
            <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {formattedDeadline}
            </div>
            <div className="flex items-center">
              {isVotingClosed ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-sm font-bold text-red-600"
                >
                  Voting has ended
                </motion.span>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-600 mr-2">
                    ⏳ Voting ends in
                  </span>
                  <span
                    className={`text-sm font-bold transition-all duration-500 ${getTimeLeftAnimation()}`}
                  >
                    {timeLeft}
                  </span>
                </>
              )}
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
                    ? " Voting's over! Check out the final results 👇"
                    : "✅ You've already voted! Here's the current result "}
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
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${selectedSlots.includes(block.id)
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
                    {getVoteCountText(block.id)}
                  </div>
                  
                  {/* Voters display */}
                  {getVoteCount(block.id) > 0 && (
                    <div className="mt-2 flex items-center">
                      <div className="flex -space-x-2">
                        {getFirstFewVoters(block.id).map((voter, index) => (
                          <img 
                            key={voter.uid} 
                            src={voter.photoURL} 
                            alt={voter.displayName} 
                            className="w-6 h-6 rounded-full border-2 border-white"
                            title={voter.displayName}
                          />
                        ))}
                        {hasMoreVoters(block.id) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              showVotersForSlot(block.id, block.day, `${block.startHour} - ${block.endHour}`);
                            }}
                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white"
                          >
                            ...
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
            className={`mt-8 w-full py-4 rounded-lg font-semibold text-lg shadow-lg transition-shadow ${selectedSlots.length === 0 || isSubmitting
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
              🎉 Voting is closed! Results will be shared with the host.
            </p>
          </div>
        )}
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${showToast ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        {toastMessage}
      </div>

      {/* Voters Modal */}
      {showVotersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Voters for {selectedSlotInfo?.day} ({selectedSlotInfo?.time})
              </h3>
              <button 
                onClick={() => setShowVotersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedSlotVoters.length > 0 ? (
                selectedSlotVoters.map((voter) => (
                  <div key={voter.uid} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                    <img 
                      src={voter.photoURL} 
                      alt={voter.displayName} 
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="font-medium text-gray-900">{voter.displayName}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No voters yet</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
