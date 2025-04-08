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
  timeSlots: TimeSlot[];
  votingDeadline: string;
  isVotingClosed: boolean;
}

interface CreateMeetingRequest {
  title: string;
  votingDeadline: string;
  timeBlocks: TimeBlock[];
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

export async function submitVote(meetingId: string, selectedSlots: string[]) {
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ selectedSlots }),
  });
  if (!response.ok) {
    throw new Error("Failed to submit vote");
  }
  return response.json();
} 