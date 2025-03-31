import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, insertParticipantSchema, insertAvailabilitySchema } from "@shared/schema";
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
  
  return httpServer;
}
