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
import { ShareIcon } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Footer from '@/components/Footer';



export default function Vote() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]); setMeeting
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
  const findMostVotedSlot = () => {
    if (!meeting?.votes || !meeting?.timeBlocks) return null;

    let maxVotes = 0;
    let maxVotedSlotId: string | null = null;

    Object.entries(meeting.votes).forEach(([blockId, voters]) => {
      const voteCount = Object.keys(voters).length;
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        maxVotedSlotId = blockId;
      }
    });

    return maxVotedSlotId;
  };

  // 투표수가 업데이트될 때마다 가장 많은 득표수를 가진 슬롯을 업데이트
  useEffect(() => {
    if (meeting?.votes) {
      setMostVotedSlot(findMostVotedSlot());
    }
  }, [meeting?.votes]);

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

  // Update the WebSocket connection handler
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
                photoURL: `https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous`,
                isGuest: false
              };
            }

            setMeeting(updatedMeeting);

            // 실시간으로 가장 많은 득표수를 가진 슬롯 업데이트
            if (updatedMeeting.votes) {
              setMostVotedSlot(findMostVotedSlot());
            }
          }
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

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
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-white to-slate-100 overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-teal-300 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-0 right-10 w-[300px] h-[300px] bg-blue-300 rounded-full blur-[80px] opacity-30" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full flex justify-between items-center px-6 py-3">
        <SlotKingLogo />
        <div className="flex items-center gap-4">
          <UserProfile />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Meeting Title and Creator Info */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent mb-4">
              {meeting.title}
            </h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={meeting.creator?.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${meeting.creator?.displayName || 'creator'}`}
                  alt="Creator"
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-slate-600">
                  Created by {meeting.creator?.displayName || 'Anonymous'}
                </span>
              </div>
              {meeting.votingDeadline && (
                <div className="text-sm text-slate-600">
                  Deadline: {format(parseISO(meeting.votingDeadline), 'yyyy-MM-dd HH:mm')}
                </div>
              )}
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
              <div key={block.id} className="relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${selectedSlots.includes(block.id)
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg"
                    : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                      ? "bg-gradient-to-r from-yellow-50 to-amber-50 hover:border-yellow-300 hover:shadow-md border-yellow-200 shadow-md"
                      : "bg-white hover:border-indigo-300 hover:shadow-md border-slate-200"
                    } ${(isVotingClosed || hasVoted) ? "opacity-75" : ""}`}
                  animate={
                    mostVotedSlot === block.id && getVoteCount(block.id) > 0
                      ? {
                        boxShadow: [
                          "0 0 0 rgba(250, 204, 21, 0.2)",
                          "0 0 8px rgba(250, 204, 21, 0.6)",
                          "0 0 0 rgba(255, 204, 0, 0.2)"
                        ]
                      }
                      : {}
                  }
                  transition={
                    mostVotedSlot === block.id && getVoteCount(block.id) > 0
                      ? {
                        repeat: Infinity,
                        duration: 2.5
                      }
                      : {}
                  }
                >
                  {/* 왕관 아이콘 - 가장 많은 득표수를 가진 슬롯에만 표시 */}
                  {mostVotedSlot === block.id && getVoteCount(block.id) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        rotateZ: [0, 5, 0, -5, 0]
                      }}
                      transition={{
                        rotateZ: { repeat: Infinity, duration: 2 },
                        default: { duration: 0.5 }
                      }}
                      className="absolute -top-4 -right-2 z-10"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="gold"
                        stroke="#FFD700"
                        strokeWidth="1"
                        className="filter drop-shadow-md"
                      >
                        <path d="M3 17l5-6 4 3 5-6.5L21 17H3zm4-6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                      </svg>
                    </motion.div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <button
                        onClick={() => handleSlotClick(block.id)}
                        disabled={isVotingClosed || hasVoted}
                        className={`w-full text-left ${(isVotingClosed || hasVoted) ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div className="font-semibold text-lg flex items-center gap-2">
                          <span className={`${mostVotedSlot === block.id && getVoteCount(block.id) > 0
                            ? "bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent"
                            : "bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                            }`}>
                            {block.day}
                          </span>
                          <span className={
                            selectedSlots.includes(block.id)
                              ? "text-white"
                              : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                                ? "text-amber-700 font-bold"
                                : "text-gray-600"
                          }>
                            {block.startHour} - {block.endHour}
                          </span>
                          {/* 가장 많은 득표수를 가진 슬롯에 인라인 왕관 아이콘 추가 */}
                          {mostVotedSlot === block.id && getVoteCount(block.id) > 0 && (
                            <motion.span
                              initial={{ scale: 0.8, opacity: 1 }}
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: 1,
                                y: [0, -3, 0]
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.5,
                                ease: "easeInOut"
                              }}
                              className="text-yellow-500 ml-1 filter drop-shadow-md"
                              style={{ fontSize: "1.2rem" }}
                            >
                              👑
                            </motion.span>
                          )}
                        </div>
                      </button>

                      {/* Vote count */}
                      <div className="mt-2">
                        <button
                          onClick={(e) => handleVoteCountClick(block.id, block.day, `${block.startHour} - ${block.endHour}`, e)}
                          className={`text-sm hover:underline cursor-pointer ${selectedSlots.includes(block.id)
                            ? "text-indigo-100"
                            : mostVotedSlot === block.id && getVoteCount(block.id) > 0
                              ? "text-amber-600 font-bold"
                              : "text-gray-500"
                            }`}
                        >
                          {getVoteCountText(block.id)}
                          {mostVotedSlot === block.id && getVoteCount(block.id) > 0 && (
                            <span className="ml-1 text-[#FFD700] font-bold">🏆 Most Votes !</span>
                          )}
                        </button>
                      </div>

                      {/* Voters display */}
                      {getVoteCount(block.id) > 0 && (
                        <div className="mt-2 flex items-center">
                          <div className="flex -space-x-2">
                            {getFirstFewVoters(block.id).map((voter) => (
                              <img
                                key={voter.uid}
                                src={voter.photoURL}
                                alt={voter.displayName}
                                title={voter.displayName}
                                className="w-6 h-6 rounded-full border-2 border-white cursor-pointer hover:ring-2 hover:ring-indigo-300"
                                onClick={() => showVotersForSlot(block.id, block.day, `${block.startHour} - ${block.endHour}`)}
                              />
                            ))}
                            {hasMoreVoters(block.id) && (
                              <button
                                onClick={() => showVotersForSlot(block.id, block.day, `${block.startHour} - ${block.endHour}`)}
                                className="w-6 h-6 rounded-full bg-gray-200 text-xs text-gray-600 border-2 border-white flex items-center justify-center cursor-pointer hover:bg-gray-300"
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
                </motion.div>
              </div>
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
              className="mt-8 w-full py-4 rounded-lg font-semibold text-lg shadow-lg transition-shadow bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-xl"
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
      </main>

      <Footer />

      {/* Toast */}
      <div
        className={`fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${showToast ? "opacity-100" : "opacity-0 pointer-events-none"
          } whitespace-pre-line `}
      >
        {toastMessage}
      </div>

      {/* Voters Modal */}
      {showVotersModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowVotersModal(false)}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Voters for {selectedSlotInfo?.day || 'Unknown'} ({selectedSlotInfo?.time || 'Unknown'})
              </h3>
              <button
                onClick={() => setShowVotersModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedSlotVoters && selectedSlotVoters.length > 0 ? (
                selectedSlotVoters.map((voter) => (
                  <motion.div
                    key={voter.uid}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-3 p-3 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all duration-150"
                    onClick={() => showVoterProfile(voter)}
                  >
                    <img
                      src={voter.photoURL}
                      alt={voter.displayName}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    />
                    <span className="text-sm font-medium text-gray-900">{voter.displayName}</span>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No voters yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Voter Profile Modal */}
      {showVoterProfileModal && selectedVoter && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999] p-4"
          onClick={() => setShowVoterProfileModal(false)}
        >
          <motion.div
            className="bg-white p-8 rounded-xl shadow-xl max-w-sm w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowVoterProfileModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <img
                src={selectedVoter.photoURL}
                alt={selectedVoter.displayName}
                className="w-24 h-24 mx-auto rounded-full border-4 border-indigo-100 shadow-lg mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedVoter.displayName}</h2>
              <p className="text-gray-500">Voter</p>
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
