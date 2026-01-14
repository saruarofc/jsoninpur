
export enum Subject {
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  BIOLOGY = 'Biology',
  MATH = 'Mathematics',
  ENGLISH = 'English',
  BENGALI = 'Bengali',
  GENERAL_KNOWLEDGE = 'General Knowledge',
  OTHER = 'Other'
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  subject: Subject;
  explanation?: string;
  imageUrl?: string;
  createdAt: number;
}

export interface ExamBank {
  id: string;
  name: string;
  questions: Question[];
  createdAt: number;
}
