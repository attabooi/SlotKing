import { auth } from "@/lib/firebase";

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
  timeSlots: TimeSlot[];
}

export interface Voter {
  uid: string;
  displayName: string;
  photoURL: string;
}

export interface Meeting {
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

export interface CreateMeetingRequest {
  title: string;
  votingDeadline: string;
  timeBlocks: TimeBlock[];
  creator?: {
    uid: string;
    displayName: string;
    photoURL: string;
  };
}

// Generate a persistent anonymous user ID
function getOrCreateUserId(): string {
  let userId = localStorage.getItem('anonymousUserId');
  if (!userId) {
    userId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    localStorage.setItem('anonymousUserId', userId);
  }
  return userId;
}

const API_BASE_URL = "http://localhost:3000/api";

// 프로필 사진 URL 생성 함수
function getProfilePhotoUrl(displayName: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(displayName)}`;
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
  
  // Ensure creator exists
  if (!meeting.creator) {
    meeting.creator = {
      uid: 'unknown',
      displayName: 'Anonymous',
      photoURL: getProfilePhotoUrl('Anonymous')
    };
  } else if (!meeting.creator.photoURL) {
    meeting.creator.photoURL = getProfilePhotoUrl(meeting.creator.displayName);
  }
  
  return meeting;
}

export async function createMeeting(data: CreateMeetingRequest): Promise<{ id: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to create a meeting");
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const photoURL = user.photoURL || getProfilePhotoUrl(displayName);

  const response = await fetch(`${API_BASE_URL}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: data.title,
      votingDeadline: data.votingDeadline,
      timeBlocks: data.timeBlocks,
      creator: {
        uid: user.uid,
        displayName,
        photoURL
      }
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create meeting");
  }
  
  return response.json();
}

export async function submitVote(meetingId: string, selectedSlots: string[], voterInfo: Voter): Promise<Meeting> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to vote");
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const photoURL = user.photoURL || getProfilePhotoUrl(displayName);

  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      selectedSlots, 
      userId: user.uid,
      voterInfo: {
        uid: user.uid,
        displayName,
        photoURL
      }
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to submit vote");
  }
  
  return response.json();
}

export async function clearVotes(meetingId: string, userId: string): Promise<Meeting> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to clear votes");
  }

  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/vote`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId: user.uid }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to clear votes");
  }
  
  return response.json();
} 