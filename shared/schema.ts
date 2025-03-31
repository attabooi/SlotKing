import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication (keeping the existing schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Meeting schema
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(), // For shareable URLs
  title: text("title").notNull(),
  organizer: text("organizer").notNull(),
  startDate: text("start_date").notNull(), // Store as ISO string
  endDate: text("end_date").notNull(), // Store as ISO string
  startTime: integer("start_time").notNull(), // Store as hour (24h format)
  endTime: integer("end_time").notNull(), // Store as hour (24h format)
  timeSlotDuration: integer("time_slot_duration").notNull(), // In minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  title: true,
  organizer: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  timeSlotDuration: true,
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// Participant schema
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(), // References meetings.id
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  meetingId: true,
  name: true,
});

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// Availability schema
export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull(), // References participants.id
  meetingId: integer("meeting_id").notNull(), // References meetings.id
  timeSlots: json("time_slots").notNull(), // Array of time slots in format "YYYY-MM-DD-HH-MM"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAvailabilitySchema = createInsertSchema(availabilities).pick({
  participantId: true,
  meetingId: true,
  timeSlots: true,
});

export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilities.$inferSelect;

// Zod schemas for frontend validation
export const createMeetingFormSchema = z.object({
  meetingTitle: z.string().min(1, "Meeting title is required"),
  organizer: z.string().min(1, "Your name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  timeSlotDuration: z.string().min(1, "Time slot duration is required"),
});

export const participantFormSchema = z.object({
  name: z.string().min(1, "Your name is required"),
});

// Types for frontend
export type TimeSlot = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  formattedDate?: string; // For display
  formattedTime?: string; // For display
  selected?: boolean; // For participant selection
  available?: number; // Count of participants available
  total?: number; // Total participants
};

export type MeetingWithTimeSlots = Meeting & {
  timeSlots: TimeSlot[];
  participants: Participant[];
  availabilities: Availability[];
};

export type WebSocketMessage = {
  type: 'participant_joined' | 'availability_updated';
  data: any;
};
