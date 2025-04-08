interface TimeSlot {
  id: string;
  day: string;
  hour: string;
  votes: number;
}

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

interface CreateMeetingRequest {
  title: string;
  votingDeadline: string;
  timeBlocks: TimeBlock[];
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

export async function getMeeting(meetingId: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch meeting");
  }
  return response.json();
}

export async function createMeeting(data: CreateMeetingRequest): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create meeting");
  }
  return response.json();
}

export async function submitVote(meetingId: string, selectedSlots: string[]): Promise<Meeting> {
  const userId = getOrCreateUserId();
  
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      selectedSlots,
      userId,
      replaceExisting: true // Tell backend to replace existing votes
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to submit vote");
  }
  
  return response.json();
}

export async function clearVotes(meetingId: string): Promise<Meeting> {
  const userId = getOrCreateUserId();
  
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