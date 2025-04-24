// client/src/lib/firestore-service.ts
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import type { CreateMeetingRequest, Meeting, Voter } from "./api";

// Fetch meeting by ID
export async function getMeetingFromFirestore(meetingId: string): Promise<Meeting> {
  const docRef = doc(db, "meetings", meetingId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error("Meeting not found");
  }

  const data = snapshot.data() as Meeting;
  return {
    ...data,
    id: snapshot.id,
    votes: data.votes || {},
  };
}

// ✅ Create a new meeting
export async function createMeetingInFirestore(data: CreateMeetingRequest): Promise<{ id: string }> {
  const docRef = await addDoc(collection(db, "meetings"), {
    ...data,
    createdAt: new Date().toISOString(),
    votes: {},
  });

  return { id: docRef.id };
}

// Submit votes for a user
export async function submitVoteToFirestore(meetingId: string, selectedSlots: string[], voter: Voter): Promise<Meeting> {
  const docRef = doc(db, "meetings", meetingId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) throw new Error("Meeting not found");

  const data = snapshot.data() as Meeting;
  const updatedVotes = { ...(data.votes || {}) };

  for (const slotId in updatedVotes) {
    if (updatedVotes[slotId][voter.uid]) {
      delete updatedVotes[slotId][voter.uid];
    }
  }

  for (const slotId of selectedSlots) {
    if (!updatedVotes[slotId]) {
      updatedVotes[slotId] = {};
    }
    updatedVotes[slotId][voter.uid] = voter;
  }

  await updateDoc(docRef, { votes: updatedVotes });

  return {
    ...data,
    id: docRef.id,
    votes: updatedVotes,
  };
}

// Clear all votes by a user
export async function clearVotesInFirestore(meetingId: string, userId: string): Promise<Meeting> {
  const docRef = doc(db, "meetings", meetingId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) throw new Error("Meeting not found");

  const data = snapshot.data() as Meeting;
  const updatedVotes = { ...(data.votes || {}) };

  for (const slotId in updatedVotes) {
    if (updatedVotes[slotId][userId]) {
      delete updatedVotes[slotId][userId];
    }
  }

  await updateDoc(docRef, { votes: updatedVotes });

  return {
    ...data,
    id: docRef.id,
    votes: updatedVotes,
  };
}
