export enum Difficulty {
  Easy = 'Fácil',
  Medium = 'Médio',
  Hard = 'Difícil',
}

export type QuizTheme = 'light' | 'dark' | 'vibrant' | 'retro' | 'neon' | 'summer' | 'autumn' | 'winter' | 'spring';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'FILL_IN_THE_BLANK';

export type GameMode = 'classic' | 'arcade' | 'tv_show' | 'speed_run';

export type ArcadeMap = 'overworld' | 'underground' | 'athletic' | 'boss';

export type TeachingStyle = 'standard' | 'socratic' | 'humorous' | 'strict' | 'gamified';

export type PowerUpType = 'skip' | 'eliminate' | 'time_freeze';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options?: string[]; // For MC and TF
  correctAnswerIndex?: number; // For MC and TF
  pairs?: MatchingPair[]; // For Matching
  explanation: string;
}

export interface QuizData {
  title: string;
  topic: string;
  difficulty: Difficulty;
  questions: Question[];
  theme: QuizTheme;
  isTvMode: boolean;
  gameMode: GameMode;
  isMultiplayer: boolean;
  isStoryMode?: boolean;
  playerNames?: string[];
  arcadeMap?: ArcadeMap;
  storyNarrative?: string;
}

export interface UserAnswers {
  [questionId: number]: any; // number (index) or MatchingPair[]
}

export type AppState = 'HOME' | 'SETUP' | 'CREATING' | 'LOADING' | 'QUIZ' | 'RESULTS' | 'CUTSCENE' | 'ERROR';

export interface QuizConfig {
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  theme: QuizTheme;
  isTvMode: boolean;
  gameMode: GameMode;
  isMultiplayer: boolean;
  isStoryMode?: boolean;
  playerNames?: string[];
  arcadeMap?: ArcadeMap;
  teachingStyle?: TeachingStyle;
}