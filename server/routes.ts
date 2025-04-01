import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertMeetingSchema, 
  insertParticipantSchema, 
  insertAvailabilitySchema, 
  insertVoteSchema, 
  insertSuggestionSchema 
} from "@shared/schema";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import WebSocket from "ws";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const clients = new Map<string, WebSocket>();
  
  wss.on('connection', (ws) => {
    const clientId = nanoid();
    clients.set(clientId, ws);
    
    ws.on('message', (message) => {
      // Handle incoming messages if needed
      console.log(`Received message from client ${clientId}`);
    });
    
    ws.on('close', () => {
      clients.delete(clientId);
    });
  });
  
  // Helper function to broadcast updates to all connected clients
  const broadcastUpdate = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };
  
  // Create a new meeting
  app.post('/api/meetings', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMeetingSchema.parse({
        title: req.body.meetingTitle,
        organizer: req.body.organizer,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        startTime: parseInt(req.body.startTime),
        endTime: parseInt(req.body.endTime),
        timeSlotDuration: parseInt(req.body.timeSlotDuration),
      });
      
      const meeting = await storage.createMeeting(validatedData);
      
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: 'Invalid meeting data', error });
    }
  });
  
  // Get a meeting by its unique ID
  app.get('/api/meetings/:uniqueId', async (req: Request, res: Response) => {
    try {
      const { uniqueId } = req.params;
      const meetingData = await storage.getMeetingWithParticipantsAndAvailabilities(uniqueId);
      
      if (!meetingData) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      res.status(200).json(meetingData);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving meeting', error });
    }
  });
  
  // Create a new participant for a meeting
  app.post('/api/meetings/:uniqueId/participants', async (req: Request, res: Response) => {
    try {
      const { uniqueId } = req.params;
      const meeting = await storage.getMeetingByUniqueId(uniqueId);
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      const validatedData = insertParticipantSchema.parse({
        meetingId: meeting.id,
        name: req.body.name,
      });
      
      const participant = await storage.createParticipant(validatedData);
      
      // Broadcast the new participant to connected clients
      broadcastUpdate('participant_joined', {
        meetingId: meeting.id,
        participant,
      });
      
      res.status(201).json(participant);
    } catch (error) {
      res.status(400).json({ message: 'Invalid participant data', error });
    }
  });
  
  // Save participant availability
  app.post('/api/meetings/:uniqueId/availability', async (req: Request, res: Response) => {
    try {
      const { uniqueId } = req.params;
      const { participantId, timeSlots } = req.body;
      
      const meeting = await storage.getMeetingByUniqueId(uniqueId);
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      // Check if participant exists
      const participants = await storage.getParticipantsByMeetingId(meeting.id);
      const participant = participants.find(p => p.id === parseInt(participantId));
      
      if (!participant) {
        return res.status(404).json({ message: 'Participant not found' });
      }
      
      // Check if participant already has availability
      const existingAvailability = await storage.getAvailabilityByParticipantId(participant.id);
      
      let availability;
      
      if (existingAvailability) {
        // Update existing availability
        availability = await storage.updateAvailability(participant.id, timeSlots);
      } else {
        // Create new availability
        const validatedData = insertAvailabilitySchema.parse({
          participantId: participant.id,
          meetingId: meeting.id,
          timeSlots,
        });
        
        availability = await storage.createAvailability(validatedData);
      }
      
      // Broadcast the availability update to connected clients
      broadcastUpdate('availability_updated', {
        meetingId: meeting.id,
        participantId: participant.id,
        availability,
      });
      
      res.status(201).json(availability);
    } catch (error) {
      res.status(400).json({ message: 'Invalid availability data', error });
    }
  });
  
  // Get all participants for a meeting
  app.get('/api/meetings/:uniqueId/participants', async (req: Request, res: Response) => {
    try {
      const { uniqueId } = req.params;
      const meeting = await storage.getMeetingByUniqueId(uniqueId);
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      const participants = await storage.getParticipantsByMeetingId(meeting.id);
      
      res.status(200).json(participants);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving participants', error });
    }
  });
  
  // Get all availabilities for a meeting
  app.get('/api/meetings/:uniqueId/availabilities', async (req: Request, res: Response) => {
    try {
      const { uniqueId } = req.params;
      const meeting = await storage.getMeetingByUniqueId(uniqueId);
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      const availabilities = await storage.getAvailabilitiesByMeetingId(meeting.id);
      
      res.status(200).json(availabilities);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving availabilities', error });
    }
  });
  
  // === NEW API ENDPOINTS FOR SLOTKING ===
  
  // 1. POST /api/createMeeting - Create a new meeting
  app.post('/api/createMeeting', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMeetingSchema.parse({
        title: req.body.title,
        organizer: req.body.organizer,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        timeSlotDuration: req.body.timeSlotDuration,
      });
      
      const meeting = await storage.createMeeting(validatedData);
      
      // If organizer info is included, also create them as the first participant
      if (req.body.organizer) {
        const organizerParticipant = await storage.createParticipant({
          meetingId: meeting.id,
          name: req.body.organizer
        });
        
        res.status(201).json({
          meeting,
          organizer: organizerParticipant
        });
      } else {
        res.status(201).json({ meeting });
      }
    } catch (error) {
      res.status(400).json({ message: 'Invalid meeting data', error });
    }
  });
  
  // 2. GET /api/getOptions - Get time slot options for a meeting
  app.get('/api/getOptions', async (req: Request, res: Response) => {
    try {
      const meetingId = req.query.meetingId as string;
      
      if (!meetingId) {
        return res.status(400).json({ message: 'Meeting ID is required' });
      }
      
      let meeting;
      
      // Check if the ID is a numeric ID or a unique ID string
      if (/^\d+$/.test(meetingId)) {
        meeting = await storage.getMeeting(parseInt(meetingId));
      } else {
        meeting = await storage.getMeetingByUniqueId(meetingId);
      }
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      // Get time slot options with availability counts
      const timeSlotOptions = await storage.calculateOptimalTimeSlots(meeting.id);
      
      res.status(200).json({
        meeting,
        timeSlots: timeSlotOptions
      });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving time slots', error });
    }
  });
  
  // 3. POST /api/vote - Submit votes for time slots
  app.post('/api/vote', async (req: Request, res: Response) => {
    try {
      const { meetingId, participantId, timeSlots, weight, metadata } = req.body;
      
      // Check if meeting exists
      let meeting;
      if (typeof meetingId === 'string' && !(/^\d+$/.test(meetingId))) {
        meeting = await storage.getMeetingByUniqueId(meetingId);
      } else {
        meeting = await storage.getMeeting(parseInt(meetingId));
      }
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      // Check if participant exists
      const participants = await storage.getParticipantsByMeetingId(meeting.id);
      const participant = participants.find(p => p.id === parseInt(participantId));
      
      if (!participant) {
        return res.status(404).json({ message: 'Participant not found' });
      }
      
      // Validate and create the vote
      const validatedData = insertVoteSchema.parse({
        meetingId: meeting.id,
        participantId: participant.id,
        timeSlots,
        weight: weight || 1,
        metadata: metadata || null
      });
      
      const vote = await storage.createVote(validatedData);
      
      // Broadcast the vote to connected clients
      broadcastUpdate('vote_submitted', {
        meetingId: meeting.id,
        participantId: participant.id,
        vote
      });
      
      res.status(201).json(vote);
    } catch (error) {
      res.status(400).json({ message: 'Invalid vote data', error });
    }
  });
  
  // 4. POST /api/suggest - Get AI suggestions (for future use)
  app.post('/api/suggest', async (req: Request, res: Response) => {
    try {
      const { meetingId, suggestedBy, constraints } = req.body;
      
      // Check if meeting exists
      let meeting;
      if (typeof meetingId === 'string' && !(/^\d+$/.test(meetingId))) {
        meeting = await storage.getMeetingByUniqueId(meetingId);
      } else {
        meeting = await storage.getMeeting(parseInt(meetingId));
      }
      
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }
      
      // This is a placeholder for future AI functionality
      // In the MVP, we'll return the best time slots based on current availabilities
      const timeSlots = await storage.calculateOptimalTimeSlots(meeting.id);
      
      // Create a suggestion record for tracking purposes
      const suggestion = await storage.createSuggestion({
        meetingId: meeting.id,
        suggestedBy: suggestedBy || 'system',
        suggestedTimeSlots: timeSlots,
        reasoning: 'Based on current participant availability',
        score: 100, // Placeholder score
        metadata: constraints || null
      });
      
      // Broadcast the suggestion to connected clients
      broadcastUpdate('suggestion_added', {
        meetingId: meeting.id,
        suggestion
      });
      
      res.status(200).json({
        suggestion,
        timeSlots
      });
    } catch (error) {
      res.status(400).json({ message: 'Error generating suggestions', error });
    }
  });
  
  // 5. GET /api/dashboard - Get meetings for the dashboard view
  app.get('/api/dashboard', async (req: Request, res: Response) => {
    try {
      // In a real app, get userId from session - using a placeholder for now
      const userId = 1; // This would normally come from auth
      
      // Get all meetings where user is either organizer or participant
      const meetings = await storage.getMeetingsForDashboard(userId);
      
      res.status(200).json(meetings);
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({ message: 'Failed to get dashboard data', error });
    }
  });
  
  return httpServer;
}
