# SlotKing API Documentation

## Overview

SlotKing's API is designed with a clean, modular architecture to support the current core scheduling functionality while allowing for future expansion with AI/MCP capabilities. This document outlines the API endpoints, data models, and design considerations.

## Core API Endpoints

### 1. Create Meeting
- **Endpoint**: `POST /api/createMeeting`
- **Purpose**: Create a new meeting room on SlotKing
- **Request Body**:
  ```json
  {
    "title": "Team Planning Session",
    "organizer": "Jane Doe",
    "startDate": "2023-11-01",
    "endDate": "2023-11-15",
    "startTime": 9,
    "endTime": 17,
    "timeSlotDuration": 30
  }
  ```
- **Response**: Returns the created meeting object with a unique ID

### 2. Get Time Slot Options
- **Endpoint**: `GET /api/getOptions?meetingId=123`
- **Purpose**: Get current time slot options for a specific meeting
- **Query Parameters**:
  - `meetingId`: ID of the meeting (can be numeric ID or unique string ID)
- **Response**: Returns meeting details and available time slots with availability data

### 3. Submit Votes
- **Endpoint**: `POST /api/vote`
- **Purpose**: Allow users or AI to vote for preferred time slots
- **Request Body**:
  ```json
  {
    "meetingId": "abc123",
    "participantId": 1,
    "timeSlots": ["2023-11-01-09-00", "2023-11-01-09-30"],
    "weight": 1,
    "metadata": {} 
  }
  ```
- **Response**: Returns the created vote object

### 4. Get AI Suggestions (Future)
- **Endpoint**: `POST /api/suggest`
- **Purpose**: Request AI-generated suggestions for optimal meeting times
- **Request Body**:
  ```json
  {
    "meetingId": "abc123",
    "suggestedBy": "user-1",
    "constraints": {
      "preferredDays": ["Monday", "Wednesday"],
      "avoidTimes": ["12:00-13:00"]
    }
  }
  ```
- **Response**: Returns suggested time slots with reasoning

## Data Models

The system is built around these core data models:

1. **Meeting**: Represents a meeting with date/time parameters and a unique identifier
2. **Participant**: Represents a user who can join a meeting and vote on time slots
3. **Availability**: Stores a participant's availability for specific time slots
4. **Vote**: Records a participant's preference for specific time slots with optional weighting
5. **Suggestion**: Stores AI-generated scheduling suggestions with reasoning and confidence scores

## Design for Future AI/MCP Integration

The API is designed to accommodate future AI capabilities:

1. **Separate Votes from Availabilities**:
   - The system distinguishes between "availability" (when someone CAN attend) and "votes" (when someone PREFERS to attend)
   - This allows AI to analyze both constraints and preferences

2. **Weighted Voting**:
   - The voting system supports weights, allowing AI to express confidence levels in its suggestions
   - Human votes can be given different weights from AI votes

3. **Suggestion Reasoning**:
   - The suggestion model includes fields for reasoning and confidence scores
   - When AI suggests times, it can explain its rationale

4. **Metadata Support**:
   - All models support metadata for custom attributes
   - This provides extensibility for future AI features without schema changes

## Real-time Updates

The system uses WebSockets for real-time updates:

- New participants joining
- Availability changes
- Vote submissions
- New suggestions

This enables a collaborative, interactive scheduling experience with immediate feedback.

## Security Considerations

- No authentication is currently implemented in the MVP
- Future versions should implement appropriate authentication and authorization
- Consider rate limiting and validation to prevent abuse

## Development Notes

### Current Status

The current implementation focuses on the core scheduling functionality without AI integration. All endpoints are operational but the `suggest` endpoint currently returns optimal times based on simple availability aggregation rather than AI-powered analysis.

### Adding AI Capabilities

When ready to add AI capabilities:

1. Implement AI client in a separate module
2. Enhance the `/api/suggest` endpoint to call the AI service
3. Add additional metadata fields as needed
4. Consider batch processing for complex scheduling problems