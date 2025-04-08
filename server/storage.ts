import { 
  users, type User, type InsertUser,
  meetings, type Meeting, type InsertMeeting, 
  participants, type Participant, type InsertParticipant,
  availabilities, type Availability, type InsertAvailability,
  votes, type Vote, type InsertVote,
  suggestions, type Suggestion, type InsertSuggestion,
  type TimeSlot 
} from "@shared/schema";
import { nanoid } from "nanoid";

interface TimeBlock {
  id: string;
  day: string;
  date: string;
  startHour: string;
  endHour: string;
}

interface Meeting {
  id: number;
  uniqueId: string;
  title: string;
  votingDeadline: string;
  timeBlocks: TimeBlock[];
  votes: { [slotId: string]: { [userId: string]: boolean } };
  createdAt: Date;
}

interface InsertMeeting {
  title: string;
  votingDeadline: string;
  timeBlocks: TimeBlock[];
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Meetings
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeetingByUniqueId(uniqueId: string): Promise<Meeting | undefined>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  updateVotes(uniqueId: string, selectedSlots: string[], userId: string, replaceExisting: boolean = true): Promise<Meeting>;
  
  // Participants
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantsByMeetingId(meetingId: number): Promise<Participant[]>;
  
  // Availabilities
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  getAvailabilitiesByMeetingId(meetingId: number): Promise<Availability[]>;
  getAvailabilityByParticipantId(participantId: number): Promise<Availability | undefined>;
  updateAvailability(participantId: number, timeSlots: any): Promise<Availability | undefined>;
  
  // Votes (for future use with AI/MCP)
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByMeetingId(meetingId: number): Promise<Vote[]>;
  getVotesByParticipantId(participantId: number): Promise<Vote[]>;
  updateVote(voteId: number, timeSlots: any): Promise<Vote | undefined>;
  
  // Suggestions (for future use with AI/MCP)
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  getSuggestionsByMeetingId(meetingId: number): Promise<Suggestion[]>;
  getBestSuggestionsForMeeting(meetingId: number, limit?: number): Promise<Suggestion[]>;
  
  // Reset functionality
  resetMeeting(uniqueId: string): Promise<boolean>;
  
  // Time slot options
  getTimeSlotOptions(meetingId: number): Promise<TimeSlot[]>;
  calculateOptimalTimeSlots(meetingId: number, minRequired?: number): Promise<TimeSlot[]>;
  
  // Combined operations
  getMeetingWithParticipantsAndAvailabilities(uniqueId: string): Promise<{
    meeting: Meeting;
    participants: Participant[];
    availabilities: Availability[];
  } | undefined>;
  
  getMeetingWithVotesAndSuggestions(uniqueId: string): Promise<{
    meeting: Meeting;
    participants: Participant[];
    votes: Vote[];
    suggestions: Suggestion[];
  } | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meetings: Map<number, Meeting>;
  private participants: Map<number, Participant>;
  private availabilities: Map<number, Availability>;
  private votes: Map<number, Vote>;
  private suggestions: Map<number, Suggestion>;
  
  private userId: number;
  private meetingId: number;
  private participantId: number;
  private availabilityId: number;
  private voteId: number;
  private suggestionId: number;

  constructor() {
    this.users = new Map();
    this.meetings = new Map();
    this.participants = new Map();
    this.availabilities = new Map();
    this.votes = new Map();
    this.suggestions = new Map();
    
    this.userId = 1;
    this.meetingId = 1;
    this.participantId = 1;
    this.availabilityId = 1;
    this.voteId = 1;
    this.suggestionId = 1;
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
    const uniqueId = nanoid(10);
    const now = new Date();
    
    const meeting: Meeting = {
      ...insertMeeting,
      id,
      uniqueId,
      votes: {},
      createdAt: now
    };
    
    this.meetings.set(id, meeting);
    return meeting;
  }

  async getMeetingByUniqueId(uniqueId: string): Promise<Meeting | undefined> {
    return Array.from(this.meetings.values()).find(
      (meeting) => meeting.uniqueId === uniqueId
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
      isHost: insertParticipant.isHost === true ? true : false,
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

  // Votes methods (for future AI/MCP functionality)
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.voteId++;
    const now = new Date();
    
    // Ensure required fields have default values
    const vote: Vote = {
      ...insertVote,
      id,
      createdAt: now,
      metadata: insertVote.metadata || {}, // Ensure metadata is set
      weight: insertVote.weight || 1 // Ensure weight is set
    };
    
    this.votes.set(id, vote);
    return vote;
  }

  async getVotesByMeetingId(meetingId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(
      (vote) => vote.meetingId === meetingId
    );
  }

  async getVotesByParticipantId(participantId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(
      (vote) => vote.participantId === participantId
    );
  }

  async updateVote(voteId: number, timeSlots: any): Promise<Vote | undefined> {
    const vote = this.votes.get(voteId);
    
    if (!vote) return undefined;
    
    const updatedVote: Vote = {
      ...vote,
      timeSlots
    };
    
    this.votes.set(voteId, updatedVote);
    return updatedVote;
  }
  
  // Suggestions methods (for future AI/MCP functionality)
  async createSuggestion(insertSuggestion: InsertSuggestion): Promise<Suggestion> {
    const id = this.suggestionId++;
    const now = new Date();
    
    // Ensure required fields have default values
    const suggestion: Suggestion = {
      ...insertSuggestion,
      id,
      createdAt: now,
      reasoning: insertSuggestion.reasoning || '', // Ensure reasoning is set
      score: insertSuggestion.score || 0, // Ensure score is set
      metadata: insertSuggestion.metadata || {} // Ensure metadata is set
    };
    
    this.suggestions.set(id, suggestion);
    return suggestion;
  }
  
  async getSuggestionsByMeetingId(meetingId: number): Promise<Suggestion[]> {
    return Array.from(this.suggestions.values()).filter(
      (suggestion) => suggestion.meetingId === meetingId
    );
  }
  
  async getBestSuggestionsForMeeting(meetingId: number, limit: number = 3): Promise<Suggestion[]> {
    const suggestions = await this.getSuggestionsByMeetingId(meetingId);
    // Sort by score (highest first) and take top N
    return suggestions
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }
  
  // Time slot options methods
  async getTimeSlotOptions(meetingId: number): Promise<TimeSlot[]> {
    const meeting = await this.getMeeting(meetingId);
    if (!meeting) return [];
    
    // This would generate time slots based on meeting parameters
    // For now, we'll create placeholder slots with dummy data
    const startDate = new Date(meeting.startDate);
    const endDate = new Date(meeting.endDate);
    const timeSlots: TimeSlot[] = [];
    
    // Create some default time slots for placeholder purposes
    // In the real implementation, this would calculate based on meeting parameters
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Generate a few example slots
    timeSlots.push({
      date: today.toISOString().split('T')[0],
      time: '09:00',
      formattedDate: today.toLocaleDateString(),
      formattedTime: '9:00 AM'
    });
    
    timeSlots.push({
      date: today.toISOString().split('T')[0],
      time: '14:00',
      formattedDate: today.toLocaleDateString(),
      formattedTime: '2:00 PM'
    });
    
    timeSlots.push({
      date: tomorrow.toISOString().split('T')[0],
      time: '10:00',
      formattedDate: tomorrow.toLocaleDateString(),
      formattedTime: '10:00 AM'
    });
    
    timeSlots.push({
      date: tomorrow.toISOString().split('T')[0],
      time: '15:00',
      formattedDate: tomorrow.toLocaleDateString(),
      formattedTime: '3:00 PM'
    });
    
    return timeSlots;
  }
  
  async calculateOptimalTimeSlots(meetingId: number, minRequired: number = 1): Promise<TimeSlot[]> {
    // Real implementation would analyze availabilities and votes
    const allTimeSlots = await this.getTimeSlotOptions(meetingId);
    const availabilities = await this.getAvailabilitiesByMeetingId(meetingId);
    const votes = await this.getVotesByMeetingId(meetingId);
    
    // Create placeholder implementation
    // In the real implementation, this would use the actual availability data
    // and implement a more sophisticated algorithm
    return allTimeSlots.map((slot, index) => ({
      ...slot,
      available: Math.min(index + 1, 5), // Higher availability for earlier slots (for demo)
      total: 5, // Total participants (placeholder)
      selected: index === 0 // First option selected as example
    }));
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
  
  async getMeetingWithVotesAndSuggestions(uniqueId: string): Promise<{
    meeting: Meeting;
    participants: Participant[];
    votes: Vote[];
    suggestions: Suggestion[];
  } | undefined> {
    const meeting = await this.getMeetingByUniqueId(uniqueId);
    
    if (!meeting) return undefined;
    
    const participants = await this.getParticipantsByMeetingId(meeting.id);
    const votes = await this.getVotesByMeetingId(meeting.id);
    const suggestions = await this.getSuggestionsByMeetingId(meeting.id);
    
    return {
      meeting,
      participants,
      votes,
      suggestions
    };
  }

  // Reset functionality
  async resetMeeting(uniqueId: string): Promise<boolean> {
    const meeting = await this.getMeetingByUniqueId(uniqueId);
    
    if (!meeting) return false;
    
    // Get all participants for this meeting
    const participants = await this.getParticipantsByMeetingId(meeting.id);
    
    // Remove all availabilities for these participants
    for (const participant of participants) {
      const availabilities = Array.from(this.availabilities.values()).filter(
        a => a.participantId === participant.id
      );
      
      for (const availability of availabilities) {
        this.availabilities.delete(availability.id);
      }
    }
    
    // Remove all votes for this meeting
    const votes = await this.getVotesByMeetingId(meeting.id);
    for (const vote of votes) {
      this.votes.delete(vote.id);
    }
    
    // Remove all suggestions for this meeting
    const suggestions = await this.getSuggestionsByMeetingId(meeting.id);
    for (const suggestion of suggestions) {
      this.suggestions.delete(suggestion.id);
    }
    
    // Find the host participant or the first one created
    const hostParticipant = participants.find(p => p.isHost === true) || 
                          (participants.length > 0 ? participants[0] : null);
    
    // Remove all participants except the host
    if (hostParticipant) {
      for (const participant of participants) {
        if (participant.id !== hostParticipant.id) {
          this.participants.delete(participant.id);
        }
      }
    }
    
    return true;
  }

  async updateVotes(uniqueId: string, selectedSlots: string[], userId: string, replaceExisting: boolean = true): Promise<Meeting> {
    const meeting = await this.getMeetingByUniqueId(uniqueId);
    
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    
    // Initialize votes object if it doesn't exist
    if (!meeting.votes) {
      meeting.votes = {};
    }
    
    // If replaceExisting is true, remove all existing votes for this user
    if (replaceExisting) {
      // Remove user's votes from all slots
      Object.keys(meeting.votes).forEach(slotId => {
        if (meeting.votes[slotId] && meeting.votes[slotId][userId]) {
          delete meeting.votes[slotId][userId];
        }
      });
    }
    
    // Add new votes
    selectedSlots.forEach(slotId => {
      if (!meeting.votes[slotId]) {
        meeting.votes[slotId] = {};
      }
      meeting.votes[slotId][userId] = true;
    });
    
    // Update meeting in storage
    this.meetings.set(meeting.id, meeting);
    
    // Return a deep copy of the meeting to ensure the client gets the updated data
    return JSON.parse(JSON.stringify(meeting));
  }
}

export const storage = new MemStorage();
