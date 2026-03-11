interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  totalScore: number;
  sessionId: number;
}

export interface Session {
  id: number;
  name: string;
  roomCode: string;
  maxParticipants: number;
  status: 'waiting' | 'active' | 'finished';
  currentStep: number;
  currentActivityId?: string;
  adminId: number;
  participantCount?: number;
  Users?: User[];
}

export interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
}

export interface QuizActivity {
  id: string;
  type: 'quiz';
  step: number;
  title: string;
  timer_seconds: number;
  scoring: {
    mode: 'time_weighted';
    base_points: number;
  };
  show_leaderboard_after_each: boolean;
  questions: QuizQuestion[];
}

export interface PuzzleActivity {
  id: string;
  type: 'puzzle_assembly';
  step: number;
  title: string;
  instruction: string;
  timer_seconds: number;
  fragments_count: number;
  scoring: {
    mode: 'self_report';
    points_per_correct: number;
  };
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
}

export type Activity = QuizActivity | PuzzleActivity;
