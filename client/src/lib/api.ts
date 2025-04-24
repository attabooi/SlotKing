import { auth } from "@/lib/firebase";
import { getCurrentUser, UserProfile, generateAvatarUrl } from '@/lib/user';
import {
  getMeetingFromFirestore,
  createMeetingInFirestore,
  submitVoteToFirestore,
  clearVotesInFirestore
} from "./firestore-service";


export interface TimeSlot {
  id: string;
  day: string;
  hour: string;
  votes: number;
}

export interface TimeBlock {
  id: string;
  day: string;
  date: string;
  startHour: string;
  endHour: string;
  timeSlots?: TimeSlot[];
}

// Use the UserProfile type from user.ts for voters
export type Voter = UserProfile;

export interface Meeting {
  id: string;
  title: string;
  timeBlocks: TimeBlock[];
  votingDeadline: string;
  votes: { [slotId: string]: { [userId: string]: Voter } };
  creator?: Voter;
}

export interface CreateMeetingRequest {
  title: string;
  votingDeadline: string;
  timeBlocks: TimeBlock[];
  creator?: Voter;
}

export const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api"; // ✅ Firebase Hosting에서는 이 경로로 rewrite됨


// Helper function to get current user info (Firebase or guest)
const getUserInfo = (): Voter | null => {
  return getCurrentUser();
};

// Generate a profile photo URL
function generateProfilePhotoUrl(displayName: string): string {
  return generateAvatarUrl(displayName);
}

export async function getMeeting(meetingId: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch meeting");
  }
  
  const meeting = await response.json();
  
  // Ensure the meeting has the required structure
  if (!meeting.votes) {
    meeting.votes = {};
  }
  
  // Ensure creator exists and has all required fields
  if (!meeting.creator) {
    meeting.creator = {
      uid: 'unknown',
      displayName: 'Anonymous',
      photoURL: generateProfilePhotoUrl('Anonymous'),
      isGuest: false
    };
  } else {
    // Make sure creator has all required fields
    if (!meeting.creator.photoURL) {
      meeting.creator.photoURL = generateProfilePhotoUrl(meeting.creator.displayName || 'Unknown');
    }
    // Make sure isGuest field is present (for backward compatibility)
    if (meeting.creator.isGuest === undefined) {
      meeting.creator.isGuest = meeting.creator.uid?.startsWith('guest-') || false;
    }
    
    // 게스트 사용자의 경우 displayName 확인
    if (meeting.creator.isGuest && !meeting.creator.displayName?.startsWith('Guest-')) {
      meeting.creator.displayName = `Guest-${meeting.creator.displayName || 'User'}`;
    }
  }
  
  return meeting;
}

export async function createMeeting(data: CreateMeetingRequest): Promise<{ id: string }> {
  // Get current user (Firebase or guest)
  const user = getUserInfo();
  if (!user) {
    throw new Error("User must be logged in or have a guest profile to create a meeting");
  }

  const response = await fetch(`${API_BASE_URL}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: data.title,
      votingDeadline: data.votingDeadline,
      timeBlocks: data.timeBlocks,
      creator: user
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create meeting");
  }
  
  return response.json();
}

export async function submitVote(meetingId: string, selectedSlots: string[], voterInfo?: Voter): Promise<Meeting> {
  // Use provided voter info or get current user
  const user = voterInfo || getUserInfo();
  if (!user) {
    throw new Error("User must be logged in or have a guest profile to vote");
  }

  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      selectedSlots, 
      userId: user.uid,
      voterInfo: user
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to submit vote");
  }
  
  return response.json();
}

export async function clearVotes(meetingId: string, userId: string): Promise<Meeting> {
  // Get current user (Firebase or guest)
  const user = getUserInfo();
  if (!user) {
    throw new Error("User must be logged in or have a guest profile to clear votes");
  }

  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/vote`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to clear votes");
  }
  
  return response.json();
} 