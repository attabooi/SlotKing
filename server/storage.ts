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
  
  // Votes (for future use with AI/MCP)
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByMeetingId(meetingId: number): Promise<Vote[]>;
  getVotesByParticipantId(participantId: number): Promise<Vote[]>;
  updateVote(voteId: number, timeSlots: any): Promise<Vote | undefined>;
  
  // Suggestions (for future use with AI/MCP)
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  getSuggestionsByMeetingId(meetingId: number): Promise<Suggestion[]>;
  getBestSuggestionsForMeeting(meetingId: number, limit?: number): Promise<Suggestion[]>;
  
  // Time slot options
  getTimeSlotOptions(meetingId: number): Promise<TimeSlot[]>;
  calculateOptimalTimeSlots(meetingId: number, minRequired?: number): Promise<TimeSlot[]>;
  
  // Dashboard operations
  getMeetingsForDashboard(userId: number): Promise<any[]>;
  
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
    const uniqueId = nanoid(10); // Generate a unique ID for the meeting URL
    const now = new Date();
    
    const meeting: Meeting = { 
      ...insertMeeting, 
      id, 
      uniqueId, 
      organizerId: insertMeeting.organizerId || 1, // Set default organizerId if not provided
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
      userId: insertParticipant.userId || 1, // Set default userId if not provided
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
  
  // Dashboard operations
  async getMeetingsForDashboard(userId: number): Promise<any[]> {
    // Get all meetings where the user is either an organizer or a participant
    const allMeetings = Array.from(this.meetings.values());
    
    // Filter meetings where user is an organizer
    const organizerMeetings = allMeetings.filter(meeting => 
      meeting.organizerId === userId
    );
    
    // Filter meetings where user is a participant (but not organizer)
    const participantMeetings = [];
    for (const meeting of allMeetings) {
      if (meeting.organizerId === userId) continue; // Skip if already counted as organizer
      
      const participants = await this.getParticipantsByMeetingId(meeting.id);
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (isParticipant) {
        participantMeetings.push(meeting);
      }
    }
    
    // Combine both sets of meetings
    const userMeetings = [...organizerMeetings, ...participantMeetings];
    
    // Enhance meetings with additional dashboard data
    const dashboardMeetings = await Promise.all(userMeetings.map(async meeting => {
      // Get participants count
      const participants = await this.getParticipantsByMeetingId(meeting.id);
      
      // Get votes to check if user has voted
      const votes = await this.getVotesByMeetingId(meeting.id);
      const userVotes = votes.filter(vote => {
        const participant = participants.find(p => p.id === vote.participantId);
        return participant?.userId === userId;
      });
      
      // Get best time slot (if any)
      const suggestions = await this.getBestSuggestionsForMeeting(meeting.id, 1);
      let topSlot = null;
      
      if (suggestions.length > 0) {
        const timeSlots = suggestions[0].suggestedTimeSlots as any[];
        if (timeSlots && timeSlots.length > 0) {
          const slot = timeSlots[0];
          if (slot.formattedDate && slot.formattedTime) {
            topSlot = `${slot.formattedDate} at ${slot.formattedTime}`;
          }
        }
      }
      
      // Calculate days left for voting
      const today = new Date();
      const endDate = new Date(meeting.endDate);
      const diffTime = endDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Return enhanced meeting data
      return {
        ...meeting,
        participants: participants.length,
        topSlot,
        hasVoted: userVotes.length > 0,
        daysLeft: daysLeft > 0 ? daysLeft : 0
      };
    }));
    
    // Sort by date (most recent first)
    return dashboardMeetings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const storage = new MemStorage();
