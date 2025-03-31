import { 
  users, type User, type InsertUser,
  meetings, type Meeting, type InsertMeeting, 
  participants, type Participant, type InsertParticipant,
  availabilities, type Availability, type InsertAvailability,
  type TimeSlot 
} from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Meetings
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeetingByUniqueId(uniqueId: string): Promise<Meeting | undefined>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  
  // Participants
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantsByMeetingId(meetingId: number): Promise<Participant[]>;
  
  // Availabilities
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  getAvailabilitiesByMeetingId(meetingId: number): Promise<Availability[]>;
  getAvailabilityByParticipantId(participantId: number): Promise<Availability | undefined>;
  updateAvailability(participantId: number, timeSlots: any): Promise<Availability | undefined>;
  
  // Combined operations
  getMeetingWithParticipantsAndAvailabilities(uniqueId: string): Promise<{
    meeting: Meeting;
    participants: Participant[];
    availabilities: Availability[];
  } | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meetings: Map<number, Meeting>;
  private participants: Map<number, Participant>;
  private availabilities: Map<number, Availability>;
  
  private userId: number;
  private meetingId: number;
  private participantId: number;
  private availabilityId: number;

  constructor() {
    this.users = new Map();
    this.meetings = new Map();
    this.participants = new Map();
    this.availabilities = new Map();
    
    this.userId = 1;
    this.meetingId = 1;
    this.participantId = 1;
    this.availabilityId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Meeting methods
  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = this.meetingId++;
    const uniqueId = nanoid(10); // Generate a unique ID for the meeting URL
    const now = new Date();
    
    const meeting: Meeting = { 
      ...insertMeeting, 
      id, 
      uniqueId, 
      createdAt: now 
    };
    
    this.meetings.set(id, meeting);
    return meeting;
  }

  async getMeetingByUniqueId(uniqueId: string): Promise<Meeting | undefined> {
    return Array.from(this.meetings.values()).find(
      (meeting) => meeting.uniqueId === uniqueId,
    );
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  // Participant methods
  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = this.participantId++;
    const now = new Date();
    
    const participant: Participant = {
      ...insertParticipant,
      id,
      createdAt: now
    };
    
    this.participants.set(id, participant);
    return participant;
  }

  async getParticipantsByMeetingId(meetingId: number): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(
      (participant) => participant.meetingId === meetingId,
    );
  }

  // Availability methods
  async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const id = this.availabilityId++;
    const now = new Date();
    
    const availability: Availability = {
      ...insertAvailability,
      id,
      createdAt: now
    };
    
    this.availabilities.set(id, availability);
    return availability;
  }

  async getAvailabilitiesByMeetingId(meetingId: number): Promise<Availability[]> {
    return Array.from(this.availabilities.values()).filter(
      (availability) => availability.meetingId === meetingId,
    );
  }

  async getAvailabilityByParticipantId(participantId: number): Promise<Availability | undefined> {
    return Array.from(this.availabilities.values()).find(
      (availability) => availability.participantId === participantId,
    );
  }

  async updateAvailability(participantId: number, timeSlots: any): Promise<Availability | undefined> {
    const availability = await this.getAvailabilityByParticipantId(participantId);
    
    if (!availability) return undefined;
    
    const updatedAvailability: Availability = {
      ...availability,
      timeSlots
    };
    
    this.availabilities.set(availability.id, updatedAvailability);
    return updatedAvailability;
  }

  // Combined operations
  async getMeetingWithParticipantsAndAvailabilities(uniqueId: string): Promise<{
    meeting: Meeting;
    participants: Participant[];
    availabilities: Availability[];
  } | undefined> {
    const meeting = await this.getMeetingByUniqueId(uniqueId);
    
    if (!meeting) return undefined;
    
    const participants = await this.getParticipantsByMeetingId(meeting.id);
    const availabilities = await this.getAvailabilitiesByMeetingId(meeting.id);
    
    return {
      meeting,
      participants,
      availabilities
    };
  }
}

export const storage = new MemStorage();
