import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, addDoc, deleteField, updateDoc } from "firebase/firestore";
import { getCurrentUser, UserProfile, generateAvatarUrl } from '@/lib/user';

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

// Firestore 기반 getMeeting
export async function getMeeting(meetingId: string): Promise<Meeting> {
  const snap = await getDoc(doc(db, "meetings", meetingId));
  if (!snap.exists()) throw new Error("Meeting not found");

  const data = snap.data() as Omit<Meeting, "id">;
  return { ...data, id: snap.id };
}

// Firestore 기반 createMeeting
export async function createMeeting(data: CreateMeetingRequest): Promise<{ id: string }> {
  const user = getCurrentUser();
  if (!user) throw new Error("User must be logged in or have a guest profile to create a meeting");

  const docRef = await addDoc(collection(db, "meetings"), {
    ...data,
    creator: user,
    votes: {},
  });

  return { id: docRef.id };
}

// Firestore 기반 submitVote
export async function submitVote(meetingId: string, selectedSlots: string[], voterInfo?: Voter): Promise<Meeting> {
  const user = voterInfo || getCurrentUser();
  if (!user) throw new Error("User must be logged in or have a guest profile to vote");

  const meetingRef = doc(db, "meetings", meetingId);
  const meetingSnap = await getDoc(meetingRef);
  if (!meetingSnap.exists()) throw new Error("Meeting not found");


  const data = meetingSnap.data();
  const updatedVotes: Record<string, Record<string, Voter>> = { ...(data.votes || {}) };
  

  // 모든 슬롯에서 기존 유저 투표 제거
  for (const slotId of Object.keys(updatedVotes)) {
    delete updatedVotes[slotId]?.[user.uid];
  }

  // 새로운 슬롯에 유저 투표 추가
  for (const slotId of selectedSlots) {
    if (!updatedVotes[slotId]) updatedVotes[slotId] = {};
    updatedVotes[slotId][user.uid] = user;
  }

  await updateDoc(meetingRef, { votes: updatedVotes });

  return { ...(data as Meeting), id: meetingId, votes: updatedVotes };
}

// Firestore 기반 clearVotes
export async function clearVotes(meetingId: string, userId: string): Promise<Meeting> {
  const user = getCurrentUser();
  if (!user) throw new Error("User must be logged in or have a guest profile to clear votes");

  const meetingRef = doc(db, "meetings", meetingId);
  const meetingSnap = await getDoc(meetingRef);
  if (!meetingSnap.exists()) throw new Error("Meeting not found");

  const data = meetingSnap.data();
  const updatedVotes: Record<string, Record<string, Voter>> = { ...(data.votes || {}) };
  

  for (const slotId of Object.keys(updatedVotes)) {
    if (updatedVotes[slotId][userId]) {
      delete updatedVotes[slotId][userId];
    }
  }

  await updateDoc(meetingRef, { votes: updatedVotes });

  return { ...(data as Meeting), id: meetingId, votes: updatedVotes };
}
