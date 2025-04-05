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
}

const API_BASE_URL = "http://localhost:3001/api";

export async function getMeeting(meetingId: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch meeting");
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