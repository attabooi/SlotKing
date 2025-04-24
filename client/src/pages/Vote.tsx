import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getMeeting, submitVote, clearVotes } from "@/lib/api";
import { SlotKingLogo } from "@/components/ui/SlotKingLogo";
import { motion } from "framer-motion";
import { format, parseISO, isAfter, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { auth } from "@/lib/firebase";
import UserProfile from "@/components/UserProfile";
import type { Meeting, TimeBlock, Voter } from "@/lib/api";
import { getCurrentUser, UserProfile as UserProfileType, hasGuestProfile } from "@/lib/user";
import GuestUserModal from "@/components/GuestUserModal";
import ShareModal from "@/components/ShareModal";
import { useI18n } from "@/lib/i18n";
import { ShareIcon, Clock, AlertTriangle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Footer from '@/components/Footer';

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
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{ day: string, time: string } | null>(null);
  const [showVoterProfileModal, setShowVoterProfileModal] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [mostVotedSlot, setMostVotedSlot] = useState<string | null>(null);

  // Guest user related states
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingVoteAction, setPendingVoteAction] = useState<{
    action: 'submit' | 'clear';
    slots?: string[];
  } | null>(null);

  const [isPremiumHost, setIsPremiumHost] = useState(false);
  const totalVotersCount = useMemo(() => {
    if (!meeting) return 0;

    const allVoters = new Set<string>();
    Object.values(meeting.votes || {}).forEach(voters => {
      Object.keys(voters).forEach(uid => allVoters.add(uid));
    });
    return allVoters.size;
  }, [meeting?.votes]);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const { t } = useI18n();

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
    console.log("showVotersForSlot called", { blockId, day, time });
    const voters = getVoters(blockId);
    console.log("Voters:", voters);
    setSelectedSlotVoters(voters);
    setSelectedSlotInfo({ day, time });
    setShowVotersModal(true);
    console.log("showVotersModal set to true");
  };

  // Show voter profile modal
  const showVoterProfile = (voter: Voter) => {
    console.log("showVoterProfile called", voter);
    setSelectedVoter(voter);
    setShowVoterProfileModal(true);
    setShowVotersModal(false);
    console.log("showVoterProfileModal set to true");
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

  // Show voters modal when vote count is clicked
  const handleVoteCountClick = (blockId: string, day: string, time: string, e: React.MouseEvent) => {
    console.log("handleVoteCountClick called", { blockId, day, time });
    e.stopPropagation();
    showVotersForSlot(blockId, day, time);
  };

  // 가장 많은 득표수를 가진 슬롯을 찾는 함수
  function findMostVotedSlot(votes: Meeting["votes"]): string | null {
    if (!votes) return null;
  
    let maxVotes = 0;
    let maxVotedSlotId: string | null = null;
  
    Object.entries(votes).forEach(([blockId, voters]) => {
      const voteCount = Object.keys(voters).length;
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        maxVotedSlotId = blockId;
      }
    });
  
    return maxVotedSlotId;
  }
  

  // 투표수가 업데이트될 때마다 가장 많은 득표수를 가진 슬롯을 업데이트
  getMeeting(meetingId!).then((meetingData) => {
    setMeeting(meetingData);
    setMostVotedSlot(findMostVotedSlot(meetingData.votes));
  });
  

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
            photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`,
            isGuest: false
          };
        }

        setMeeting(meetingData);

        // 🔥 Premium 여부 확인
        try {
          const userDoc = await getDoc(doc(db, "users", meetingData.creator.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("🔥 Firestore userData:", userData);
            console.log("👑 isPremiumHost = ", userData.isPremium);
            setIsPremiumHost(userData.isPremium === true);
          } else {
            setIsPremiumHost(false);
          }
        } catch (err) {
          console.error("Failed to fetch premium status:", err);
          setIsPremiumHost(false);
        }

        // Check if voting is closed based on deadline
        const deadlineDate = parseISO(meetingData.votingDeadline);
        const now = new Date();
        const isDeadlinePassed = isAfter(now, deadlineDate);
        setIsVotingClosed(isDeadlinePassed);

        // Check if user (Firebase or guest) has already voted
        const currentUser = getCurrentUser();
        if (currentUser) {
          const userVotes = Object.entries(meetingData.votes)
            .filter(([_, voters]) => voters[currentUser.uid])
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

  // Add a handler for guest user modal completion
  const handleGuestComplete = (guestProfile: UserProfileType) => {
    setShowGuestModal(false);

    // Complete the pending vote action
    if (pendingVoteAction) {
      if (pendingVoteAction.action === 'submit' && pendingVoteAction.slots) {
        // Submit vote with new guest profile
        submitVoteWithUser(pendingVoteAction.slots, guestProfile);
      } else if (pendingVoteAction.action === 'clear') {
        // Clear vote with new guest profile
        clearVotesWithUser(guestProfile);
      }
      // Reset pending action
      setPendingVoteAction(null);
    }
  };

  // Extract submit vote logic to reuse
  const submitVoteWithUser = async (slots: string[], user: UserProfileType) => {
    setIsSubmitting(true);
    try {
      const updatedMeeting = await submitVote(meetingId!, slots, user);
      console.log("Updated meeting after vote:", updatedMeeting);

      // Ensure we have the updated votes object
      if (updatedMeeting && updatedMeeting.votes) {
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

  // Extract clear votes logic to reuse
  const clearVotesWithUser = async (user: UserProfileType) => {
    setIsSubmitting(true);
    try {
      const updatedMeeting = await clearVotes(meetingId!, user.uid);
      console.log("Meeting after clearing votes:", updatedMeeting);

      if (updatedMeeting) {
        // Update the meeting state with new data
        setMeeting(updatedMeeting);
        setHasVoted(false);
        setSelectedSlots([]);

        setToastMessage("Your votes have been cleared!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
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

  // Update the handleSubmit function
  const handleSubmit = async () => {
    if (selectedSlots.length === 0 || isVotingClosed) return;

    // Get current user (Firebase or guest)
    const currentUser = getCurrentUser();

    // If no user and no guest profile, show the guest modal
    if (!currentUser) {
      setPendingVoteAction({ action: 'submit', slots: selectedSlots });
      setShowGuestModal(true);
      return;
    }

    // Submit vote with the current user
    if (!isPremiumHost) {
      // 전체 unique voter 수 계산
      const allVoters = new Set<string>();
      Object.values(meeting.votes || {}).forEach(voters => {
        Object.keys(voters).forEach(uid => allVoters.add(uid));
      });

      if (!hasVoted && allVoters.size >= 5) {
        setToastMessage("❌ Free hosts are limited to 10 voters. \n✨ Upgrade to Premium for unlimited access!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        return;
      }
    }
    await submitVoteWithUser(selectedSlots, currentUser);
  };

  // Update the handleVoteAgain function
  const handleVoteAgain = async () => {
    if (isVotingClosed) return;

    // Get current user (Firebase or guest)
    const currentUser = getCurrentUser();

    // If no user and no guest profile, show the guest modal
    if (!currentUser) {
      setPendingVoteAction({ action: 'clear' });
      setShowGuestModal(true);
      return;
    }

    // Clear votes with the current user
    await clearVotesWithUser(currentUser);
  };
  

  useEffect(() => {
    if (!meetingId) return;
  
    getMeeting(meetingId).then((meetingData) => {
      setMeeting(meetingData);
      // Optional: most voted 계산
      setMostVotedSlot(findMostVotedSlot(meetingData.votes));
    });
  }, [meetingId]);
  // // Update the WebSocket connection handler
  // useEffect(() => {
  //   if (!meetingId) return;

  //   const ws = new WebSocket(`ws://localhost:3000/ws`);

  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);

  //     if (data.type === 'votes_updated' && data.data.meetingId === meetingId) {
  //       // Fetch the latest meeting data when votes are updated
  //       getMeeting(meetingId).then(updatedMeeting => {
  //         if (updatedMeeting) {
  //           // Ensure creator exists
  //           if (!updatedMeeting.creator) {
  //             updatedMeeting.creator = {
  //               uid: 'unknown',
  //               displayName: 'Anonymous',
  //               photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`,
  //               isGuest: false
  //             };
  //           }

  //           setMeeting(updatedMeeting);

  //           // 실시간으로 가장 많은 득표수를 가진 슬롯 업데이트
  //           if (updatedMeeting.votes) {
  //             setMostVotedSlot(findMostVotedSlot());
  //           }
  //         }
  //       });
  //     }
  //   };

  //   return () => {
  //     ws.close();
  //   };
  // }, [meetingId]);

  // Toggle share modal
  const handleToggleShareModal = () => {
    setShowShareModal(!showShareModal);
  };

  // Close share modal
  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-medium text-red-500 mb-2">Meeting Not Found</h1>
          <p className="text-sm text-gray-600">The meeting you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const deadlineDate = parseISO(meeting.votingDeadline);
  const formattedDeadline = format(deadlineDate, "MMMM d, yyyy 'at' h:mm a");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header - simplified and flattened */}
      <header className="w-full flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-white">
        <SlotKingLogo />
        <UserProfile />
      </header>

      {/* Main Content - consistent width and simplified */}
      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Title and creator section - more compact and left-aligned */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{meeting.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={
                    meeting.creator?.photoURL ||
                    `https://api.dicebear.com/7.x/thumbs/svg?seed=${meeting.creator?.displayName || 'creator'}`
                  }
                  alt="Creator"
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-xs text-gray-500">
                  Created by {meeting.creator?.displayName || 'Anonymous'}
                </span>
              </div>
            </div>

            {/* Deadline info - more compact */}
            {meeting.votingDeadline && (
              <div className="text-right">
                <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                  <Clock size={12} className="inline" />
                  <span>{format(parseISO(meeting.votingDeadline), 'yyyy-MM-dd HH:mm')}</span>
                </div>
                {!isVotingClosed ? (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs text-gray-500">Ends in</span>
                    <span className={`text-xs font-medium ${timeLeft.includes("00:") ? "text-red-500" : "text-blue-500"}`}>
                      {timeLeft}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-red-500">Voting closed</div>
                )}
              </div>
            )}
          </div>

          {/* Status message - simplified with subtle styling */}
          {(isVotingClosed || hasVoted) && (
            <div className="flex items-center bg-amber-50 px-3 py-2 rounded mb-4">
              <AlertTriangle size={14} className="text-amber-500 mr-2" />
              <p className="text-xs text-amber-700 flex-grow">
                {isVotingClosed
                  ? "Voting's over! Check out the final results below."
                  : "You've already voted! Here's the current result."}
              </p>
              {!isVotingClosed && (
                <button
                  onClick={handleVoteAgain}
                  className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Vote Again
                </button>
              )}
            </div>
          )}

          {/* Time blocks list - redesigned to be more compact and flat */}
          <div className="bg-white rounded shadow-sm p-4 mb-4">
            <div className="space-y-2">
              {Array.isArray(meeting.timeBlocks) && meeting.timeBlocks.map((block) => (
                <div key={block.id} className="relative">
                  <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full px-3 py-2 rounded flex items-center justify-between transition-all ${
                      selectedSlots.includes(block.id)
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                          ? "bg-amber-50 border-l-4 border-amber-400"
                          : "bg-gray-50 border-l-4 border-transparent hover:border-gray-200"
                    } ${(isVotingClosed || hasVoted) ? "opacity-90" : ""}`}
                  >
                    <button
                      onClick={() => handleSlotClick(block.id)}
                      disabled={isVotingClosed || hasVoted}
                      className={`flex-grow text-left flex items-center ${(isVotingClosed || hasVoted) ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex-grow">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            selectedSlots.includes(block.id)
                              ? "text-blue-700"
                              : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                                ? "text-amber-700"
                                : "text-gray-700"
                          }`}>
                            {block.day}
                          </span>
                          <span className={`ml-2 text-sm ${
                            selectedSlots.includes(block.id)
                              ? "text-blue-600"
                              : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                                ? "text-amber-600"
                                : "text-gray-600"
                          }`}>
                            {block.startHour} - {block.endHour}
                          </span>
                          {mostVotedSlot === block.id && getVoteCount(block.id) > 0 && (
                            <span className="text-amber-500 ml-1 text-xs font-medium">
                              (Most votes)
                            </span>
                          )}
                        </div>
                      
                        <div className="flex items-center mt-1">
                          <button
                            onClick={(e) => handleVoteCountClick(block.id, block.day, `${block.startHour} - ${block.endHour}`, e)}
                            className={`text-xs hover:underline ${
                              selectedSlots.includes(block.id)
                                ? "text-blue-500"
                                : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                                  ? "text-amber-500 font-medium"
                                  : "text-gray-500"
                            }`}
                          >
                            {getVoteCountText(block.id)}
                          </button>
                        
                          {/* Voters avatars - simplified */}
                          {getVoteCount(block.id) > 0 && (
                            <div className="flex -space-x-1 ml-2">
                              {getFirstFewVoters(block.id, 2).map((voter) => (
                                <img
                                  key={voter.uid}
                                  src={voter.photoURL}
                                  alt={voter.displayName}
                                  title={voter.displayName}
                                  className="w-4 h-4 rounded-full border border-white"
                                  onClick={() => showVotersForSlot(block.id, block.day, `${block.startHour} - ${block.endHour}`)}
                                />
                              ))}
                              {hasMoreVoters(block.id, 2) && (
                                <button
                                  onClick={() => showVotersForSlot(block.id, block.day, `${block.startHour} - ${block.endHour}`)}
                                  className="w-4 h-4 rounded-full bg-gray-200 text-xs text-gray-600 border border-white flex items-center justify-center"
                                >
                                  <span className="text-[8px]">+</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Checkmark for selected slots - simplified */}
                    {selectedSlots.includes(block.id) && (
                      <div className="text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                </div>
              ))}

              {(!Array.isArray(meeting.timeBlocks) || meeting.timeBlocks.length === 0) && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No time blocks available for this meeting.</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit button - simplified */}
          {!isVotingClosed && !hasVoted && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSubmit}
              className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Vote"}
            </motion.button>
          )}

          {isVotingClosed && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Voting is closed. Results will be shared with the host.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Toast - simplified styling */}
      <div
        className={`fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded text-sm shadow-sm transition-opacity duration-300 ${
          showToast ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {toastMessage}
      </div>

      {/* Voters Modal - simplified styling */}
      {showVotersModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowVotersModal(false)}
        >
          <motion.div
            className="bg-white rounded shadow-sm max-w-md w-full p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-900">
                Voters for {selectedSlotInfo?.day || 'Unknown'} ({selectedSlotInfo?.time || 'Unknown'})
              </h3>
              <button
                onClick={() => setShowVotersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedSlotVoters && selectedSlotVoters.length > 0 ? (
                selectedSlotVoters.map((voter) => (
                  <motion.div
                    key={voter.uid}
                    whileHover={{ backgroundColor: "rgba(243, 244, 246, 1)" }}
                    className="flex items-center gap-2 p-2 rounded cursor-pointer"
                    onClick={() => showVoterProfile(voter)}
                  >
                    <img
                      src={voter.photoURL}
                      alt={voter.displayName}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs text-gray-700">{voter.displayName}</span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">No voters yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Voter Profile Modal - simplified styling */}
      {showVoterProfileModal && selectedVoter && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-[9999] p-4"
          onClick={() => setShowVoterProfileModal(false)}
        >
          <motion.div
            className="bg-white rounded shadow-sm max-w-xs w-full p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowVoterProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <img
                src={selectedVoter.photoURL}
                alt={selectedVoter.displayName}
                className="w-16 h-16 mx-auto rounded-full border-2 border-gray-100 mb-2"
              />
              <h2 className="text-sm font-medium text-gray-900 mb-1">{selectedVoter.displayName}</h2>
              <p className="text-xs text-gray-500">Voter</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={handleCloseShareModal}
          voteUrl={typeof window !== 'undefined'
            ? `${window.location.origin}/vote/${meetingId}`
            : `/vote/${meetingId}`}
        />
      )}

      {/* Guest User Modal */}
      {showGuestModal && (
        <GuestUserModal
          onComplete={handleGuestComplete}
          onClose={() => setShowGuestModal(false)}
        />
      )}
    </div>
  );
}
