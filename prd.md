# AdaptVR — Product Requirements Document

## Trainer Dashboard & Backend System

### 1. Product Overview

**AdaptVR** is an AI-driven adaptive VR learning system that monitors learner interactions during VR learning sessions, estimates learner state using a trained XGBoost model, and dynamically adapts the learning experience.

The **Trainer Dashboard and Backend** provide the management and monitoring infrastructure around the VR learning environment.

The Trainer Dashboard allows instructors to:

* Manage students
* Manage learning modules
* Assign modules to students
* Start and manage learning sessions
* Monitor learner progress
* Review session results
* View learner-state and adaptation analytics
* Generate learning reports

The Backend provides:

* Authentication
* Student and instructor management
* Learning-module management
* Session management
* Data storage
* VR-client communication
* Analytics
* Report generation

---

# 2. Product Goals

### Primary Goals

1. Provide instructors with a centralized interface for managing learners and learning modules.
2. Provide the VR application with the session configuration required to conduct learning sessions.
3. Store learner interaction and session information reliably.
4. Maintain a history of learner performance and adaptive interventions.
5. Provide meaningful analytics to instructors.
6. Support communication between the VR client and backend.
7. Keep the system modular so additional learning modules can be added later.

---

# 3. System Context

The system consists of three major components:

```text
┌──────────────────────┐
│  Trainer Dashboard   │
│  React + TypeScript  │
└──────────┬───────────┘
           │ HTTPS REST API
           ▼
┌──────────────────────┐
│    Backend Server    │
│ Node.js + Express.js │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ PostgreSQL Database  │
└──────────┬───────────┘
           ▲
           │
     REST / WebSocket
           │
┌──────────┴───────────┐
│      VR Client       │
│ Unity + Meta Quest 2 │
└──────────┘───────────┘
```

The VR client performs the actual learning experience and local learner-state inference, while the backend manages persistent data, sessions, users, and analytics.

---

# 4. Users

## 4.1 Trainer / Instructor

The primary dashboard user.

The instructor can:

* Log in
* Manage students
* Manage learning modules
* Assign modules
* Start sessions
* Monitor sessions
* View learner performance
* Review adaptive interventions
* Generate reports

## 4.2 Learner

The learner primarily interacts with the VR application.

The learner does not directly use the trainer dashboard.

The VR application sends session and interaction information to the backend.

## 4.3 VR Devices & Shared Hardware Architecture

* **Hardware Decoupling**: VR devices (e.g., Meta Quest 2 headsets) are shared hardware assets belonging to the school/institution. They are **not** hardcoded or tied to any individual student.
* **Shared Usage**: A school typically has 1 or 2 VR headsets that are shared among all students in turn.
* **Dynamic Device Pairing**: When starting a session, the trainer selects the student, the learning module, and the target active VR device (or device pairing code) to dispatch the session to that headset.

---

# 5. Trainer Dashboard

## 5.1 Login

### Purpose

Authenticate the trainer before providing access to student and learning data.

### Requirements

The dashboard shall provide:

* Email/username field
* Password field
* Login button
* Error message for invalid credentials
* Session/logout functionality

### Backend

Authentication should be handled by the backend.

The dashboard should not directly access the database.

```text
Trainer
   ↓
Login
   ↓
React Dashboard
   ↓
POST /auth/login
   ↓
Backend
   ↓
Authentication
   ↓
Access Token
```

---

# 6. Dashboard Home

The home screen should provide a quick overview of the learning system.

### Information displayed

* Total students
* Active sessions
* Completed sessions
* Available learning modules
* Recent sessions
* Recent learner performance

### Purpose

The trainer should be able to understand the current system status without opening individual pages.

---

# 7. Student Management

## Purpose

Allow the trainer to manage learner profiles.

### Functions

The trainer shall be able to:

* Add a student
* View students
* Search students
* Edit student information
* View student profile
* View learning history

### Student information

Example:

```text
Student ID
Name
Age
Grade
Assigned Modules
Session Count
Average Score
Last Session
```

### Student Profile

The profile should show:

* Basic learner information
* Assigned modules
* Completed sessions
* Performance history
* State-estimation history
* Adaptation history

---

# 8. Learning Module Management

## Purpose

Allow trainers to manage the educational content available in the VR system.

### Functions

The trainer shall be able to:

* View available modules
* Add modules
* Edit modules
* Activate/deactivate modules
* Assign modules
* View module difficulty

### Module information

```text
Module ID
Module Name
Category
Description
Difficulty Level
Status
```

Examples:

* Solar System
* Human Body Systems
* Block-Based Coding
* Geometry
* Food Web

The learning module itself is developed in Unity; the dashboard manages its metadata and availability.

The module design should support short, measurable activities with clear interactions and error types so that meaningful behavioral features can be generated for the adaptive system.

---

# 9. Module Assignment

A trainer can assign a learning module to one or more students.

### Flow

```text
Trainer
   ↓
Select Student
   ↓
Select Module
   ↓
Assign
   ↓
Backend
   ↓
Database
```

### Assignment record

The backend stores:

* Teacher ID
* Student ID
* Module ID
* Assignment timestamp

This corresponds to the `TEACHER_MODULE` / assignment concept in the system data model.

---

# 10. Session Management

A **session** represents one learner's attempt at a particular learning module.

### Trainer functions

The trainer can:

* Start a session
* Select student
* Select module
* Select active VR Device (from school's pool of 1-2 shared headsets)
* View active sessions
* End a session
* View completed sessions

### Start Session Flow

```text
Trainer
   ↓
Select Student
   ↓
Select Module
   ↓
Select / Pair Target VR Device
   ↓
Start Session
   ↓
Backend creates Session ID & dispatches to selected VR Device
   ↓
Target VR Headset receives configuration
   ↓
Learning begins
```

### Session information

```text
Session ID
Student
Module
VR Device ID / Name
Start Time
End Time
Completion Status
Final Score
```

---

# 11. VR Session Communication

The backend acts as the coordination layer between the trainer dashboard and VR client devices.

### Session initialization

The backend sends:

* Session ID
* Device ID
* Student ID
* Module ID
* Module configuration
* Initial difficulty
* Session settings

to the specific targeted VR headset.

### During session

The VR client performs:

```text
Interaction Collection
        ↓
Feature Engineering
        ↓
XGBoost Inference
        ↓
Learner State
        ↓
Adaptation
```

The backend receives relevant session summaries and events for storage and monitoring.

---

# 12. Real-Time Communication

REST APIs are used for normal operations such as:

* Login
* Student management
* Module management
* Session creation
* Report retrieval

A real-time channel such as **WebSocket** can be used for:

* Session status
* Pause/resume commands
* Adaptation notifications
* Live monitoring updates

The real-time channel should not be used to continuously transmit every raw VR frame.

Only meaningful application events or summaries should be transmitted.

---

# 13. Interaction Data

The VR client generates learner interaction events.

Examples:

```text
Task started
Object selected
Object grabbed
Answer submitted
Incorrect answer
Hint requested
Task completed
Task failed
Session paused
```

Each event should contain:

```text
Event ID
Session ID
Timestamp
Event Type
Object / Task
Relevant Value
```

These events form the raw behavioral data used for later feature extraction and analytics.

---

# 14. Learner-State Data

The VR client uses the trained XGBoost model to estimate the learner's state.

Possible states:

```text
Low
Medium
High
```

Each prediction should contain:

```text
Prediction ID
Session ID
Predicted State
Confidence Score
Timestamp
```

The dashboard should present these as **estimated learner states**, not medical or diagnostic measurements.

---

# 15. Adaptation History

Every significant adaptation should be recorded.

Example:

```text
Time: 10:32:14

Estimated State: High

Adaptation:
Difficulty reduced

Reason:
Repeated errors + increased response time
```

Possible adaptations:

* Difficulty reduction
* Difficulty increase
* Hint provided
* Additional explanation
* Task simplification
* Additional support

This allows the instructor to understand **what the system changed and when**.

---

# 16. Live Monitoring

The live monitoring screen provides information about an active session.

### Display

* Student name
* Current module
* Session duration
* Current task
* Progress
* Current estimated learner state
* Recent adaptation
* Errors
* Hints used

### Important design principle

The dashboard should show **interpretable summaries**, not raw ML values.

For example:

```text
Learner State
HIGH

Support
Additional hint provided

Progress
65%

Errors
3
```

rather than displaying raw XGBoost tree outputs.

---

# 17. Analytics

The analytics section should allow trainers to understand learner progress over time.

### Performance Analytics

Display:

* Quiz scores
* Completion time
* Error count
* Attempts
* Module completion
* Progress over sessions

### Behavioral Analytics

Display:

* Interaction frequency
* Response time
* Idle time
* Hint usage
* Task attempts

### Learner-State Analytics

Display:

* Distribution of Low / Medium / High estimates
* State changes during a session
* Adaptation frequency

### Adaptation Analytics

Display:

* Number of hints
* Difficulty changes
* Additional explanations
* Adaptation events by session

---

# 18. Reports

The backend should generate a session or learner report.

### Session Report

```text
Student
Module
Session Duration
Final Score
Completion Status

Behavior Summary
State Estimates
Adaptation Events

Performance Summary
```

### Learner Progress Report

Can combine multiple sessions to show:

* Score progression
* Module completion
* Average performance
* State-estimation trends
* Adaptation frequency

---

# 19. Backend Architecture

The backend consists of the following logical services:

```text
Backend Server

├── Authentication Service
├── User / Student Management
├── Module Management
├── Session Management
├── API Gateway / Routing
├── Analytics Service
├── Report Generation
└── Database Access
```

---

# 20. Authentication Service

### Responsibilities

* Authenticate trainers
* Validate credentials
* Generate authentication tokens
* Validate protected requests
* Handle logout/session expiry

### Security

Passwords must never be stored as plain text.

Only password hashes should be stored.

---

# 21. Student Management Service

Handles:

* Student creation
* Student retrieval
* Student modification
* Student deletion/deactivation
* Student-session history

---

# 22. Module Management Service

Handles:

* Module creation
* Module retrieval
* Module modification
* Module activation/deactivation
* Module assignment

---

# 23. Session Management Service

Handles:

* Session creation
* Session initialization
* Session status
* Session completion
* Session summary
* Session history

---

# 24. Analytics Service

The analytics service processes stored session information to produce instructor-facing summaries.

Examples:

```text
Average score
Completion rate
Average response time
Error frequency
Hint usage
State distribution
Adaptation frequency
```

Analytics should be based on stored session/event data rather than directly exposing database tables to the frontend.

---

# 25. Database

The backend uses PostgreSQL.

Core entities:

```text
TEACHER
STUDENT
LEARNING_MODULE
TEACHER_MODULE
VR_DEVICE
SESSION
INTERACTION_EVENT
ML_PREDICTION
```

### Relationship

```text
Teacher
   │
   ├── manages ──> Students
   │
   ├── manages ──> Modules
   │
   └── manages ──> VR Devices (Shared School Hardware Assets)

Student ───────┐
               ▼
Module  ───> SESSION <─── VR Device (Assigned dynamically per session)
               │
               ├── records ──> Interaction Events
               │
               └── generates ──> ML Predictions
```

One session can contain **multiple interaction events and multiple learner-state predictions**.

---

# 26. API Requirements

The backend should expose REST APIs approximately as follows.

### Authentication

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Students

```text
GET    /api/students
POST   /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
```

### Modules

```text
GET    /api/modules
POST   /api/modules
GET    /api/modules/:id
PUT    /api/modules/:id
DELETE /api/modules/:id
```

### VR Devices (Shared Hardware)

```text
GET    /api/devices
POST   /api/devices
GET    /api/devices/:id
PUT    /api/devices/:id
DELETE /api/devices/:id
POST   /api/devices/:id/pair
```

### Assignments

```text
POST   /api/assignments
GET    /api/assignments
DELETE /api/assignments/:id
```

### Sessions

```text
POST /api/sessions
GET  /api/sessions
GET  /api/sessions/:id
POST /api/sessions/:id/end
```

### Analytics

```text
GET /api/analytics/student/:id
GET /api/analytics/session/:id
GET /api/analytics/module/:id
```

### Reports

```text
GET /api/reports/session/:id
GET /api/reports/student/:id
```

---

# 27. WebSocket Events

For real-time communication, example events include:

### Backend → VR

```text
session.started
session.paused
session.resumed
session.ended
adaptation.command
```

### VR → Backend

```text
session.ready
interaction.event
session.progress
session.summary
```

The exact event protocol can be finalized during implementation.

---

# 28. Failure Handling

The system should not depend completely on continuous network connectivity.

### VR Client Failure

The client should periodically store important session information locally.

If the application restarts:

```text
Local Cache
    ↓
Recover Unsynchronized Data
    ↓
Backend
```

### Network Failure

The VR application should continue collecting important session data locally.

When connectivity returns:

```text
Local Cache
     ↓
Synchronization
     ↓
Backend Database
```

### Backend Failure

The VR client should continue local learning and local learner-state inference where possible.

Persistent synchronization resumes when the backend becomes available.

---

# 29. Data Synchronization

The synchronization mechanism should ensure that locally stored events are not uploaded multiple times.

Each event should have a unique ID.

Example:

```text
event_id = UUID
```

The backend can use this ID to identify already synchronized events.

---

# 30. Non-Functional Requirements

## Performance

* Dashboard pages should load quickly under normal conditions.
* Session information should be updated with minimal delay.
* ML inference should occur without noticeably interrupting the VR experience.

## Reliability

* Session data should be protected against temporary network failures.
* Local caching should minimize data loss.

## Security

* HTTPS should be used for network communication.
* Passwords should be securely hashed.
* Authentication should be required for protected APIs.
* Student information should not be publicly accessible.

## Privacy

Only information necessary for the learning system should be stored.

The system should avoid unnecessary personally identifiable or sensitive data.

## Scalability

The backend should allow:

* Additional students
* Additional learning modules
* Additional sessions
* Additional analytics

without requiring changes to the fundamental architecture.

---

# 31. MVP Scope

For the first working version, implement only:

### Dashboard

* Login
* Student management
* Module management
* Start session
* Session history
* Basic analytics

### Backend

* Authentication
* Student APIs
* Module APIs
* Session APIs
* PostgreSQL database
* Basic analytics APIs

### VR Communication

* Start session
* Send session summary
* Store interaction events

### Analytics

* Score
* Completion time
* Errors
* Interaction count
* Learner-state predictions
* Adaptation history

---

# 32. Future Scope

The following should not be considered mandatory for the first implementation:

* Multi-institution support
* Advanced cloud deployment
* Complex role-based access control
* Predictive learner analytics
* Automated model retraining
* Large-scale multi-user live monitoring
* Advanced recommendation systems
* Mobile trainer application

These can be added later without changing the fundamental architecture.

---

# 33. End-to-End Workflow

The complete system should work approximately as follows:

```text
TRAINER

Login
  ↓
Select Student
  ↓
Select Learning Module
  ↓
Start Session
  ↓
BACKEND
  ↓
Create Session
  ↓
Send Session Configuration
  ↓
VR CLIENT
  ↓
Learner Starts Learning
  ↓
Interaction Monitoring
  ↓
Feature Engineering
  ↓
XGBoost Inference
  ↓
Learner State Estimation
  ↓
Adaptation Engine
  ↓
Adaptive VR Experience
  ↓
Session Summary
  ↓
BACKEND
  ↓
PostgreSQL
  ↓
Analytics
  ↓
TRAINER DASHBOARD
  ↓
Performance + State + Adaptation Report
```

---

# 34. Product Success Criteria

The Trainer Dashboard and Backend will be considered successfully implemented when:

1. A trainer can authenticate successfully.
2. A trainer can create and manage students.
3. A trainer can manage learning modules.
4. A trainer can assign modules to students.
5. A trainer can start and end a VR session.
6. The VR client receives the correct session configuration.
7. Interaction and session data can be stored successfully.
8. Learner-state predictions can be associated with the correct session.
9. Adaptation events can be recorded.
10. The trainer can view meaningful performance and adaptation analytics.
11. Temporary network failures do not immediately result in permanent loss of locally cached session data.
12. The system can support adding new learning modules without redesigning the backend.

---

# 35. Recommended Implementation Order

Since you are developing this from scratch, **do not build everything simultaneously**.

### Phase 1 — Database

```text
PostgreSQL
    ↓
Tables
    ↓
Relationships
```

### Phase 2 — Backend Basics

```text
Node.js
    ↓
Express
    ↓
REST APIs
```

Implement:

* Students
* Modules
* Sessions

### Phase 3 — Dashboard

```text
React + TypeScript
        ↓
REST APIs
        ↓
Display Data
```

First make the dashboard work with normal CRUD operations.

### Phase 4 — VR Integration

Connect:

```text
Unity
  ↕
Backend
```

Start with:

```text
Start Session
     ↓
Session ID
     ↓
VR
     ↓
Session Summary
     ↓
Backend
```

### Phase 5 — Interaction Data

Add:

```text
VR Events
    ↓
Backend
    ↓
PostgreSQL
```

### Phase 6 — ML Integration

Finally:

```text
VR Behavioral Data
        ↓
Feature Engineering
        ↓
XGBoost
        ↓
Learner State
        ↓
Adaptation
```

This order is important because **you do not need the ML model to start developing the dashboard or backend**. You can use sample session data initially and integrate the real ML pipeline later.
