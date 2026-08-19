export interface User {
  id: string;
  full_name: string;
  email: string;
  created_at?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  age?: number;
  sessions: number;
  avgScore: number;
  needsAttention: boolean;
  latestModule: string;
  avatarBg: string;
  initials: string;
}

export interface LearningModule {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  status: 'active' | 'inactive' | 'archived';
  sessionsCount?: number;
}

export interface Session {
  id: string;
  studentName: string;
  deviceId: string;
  moduleName: string;
  status: 'Active' | 'Completed' | 'In Progress' | 'Paused' | 'Aborted';
  score?: number;
  duration?: string;
  startTime?: string;
  endTime?: string;
  cognitiveLoad?: 'low' | 'medium' | 'high';
}

export interface Headset {
  id: string;
  code: string;
  battery: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Charging';
  assignedStudent?: string;
  assignedModule?: string;
}

export interface TelemetryPayload {
  type: string;
  sessionId?: string;
  data?: any;
  timestamp?: string;
}
