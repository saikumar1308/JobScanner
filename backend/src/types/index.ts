// Backend type definitions
// These will be populated in subsequent tasks

export interface JobListing {
  jobId: string;
  jobTitle: string;
  location: string;
  requiredExperience: number;
  requiredSkills: string[];
  description: string;
  applyUrl: string;
  scrapedAt: Date;
}

export interface CandidateProfile {
  skills: string[];
  yearsOfExperience: number;
  technologies: string[];
  previousRoles: string[];
  rawText: string;
  parsedAt: Date;
}

export interface MatchResult {
  jobId: string;
  jobTitle: string;
  location: string;
  requiredExperience: number;
  matchScore: number;
  suitable: boolean;
  missingSkills: string[];
  experienceGap: number;
  reasoning: string;
  applyUrl: string;
  analyzedAt: Date;
}

export interface ProgressState {
  currentJob: number;
  totalJobs: number;
  operation: 'scraping' | 'parsing' | 'matching';
  estimatedTimeRemaining: number;
}

export interface SessionData {
  sessionId: string;
  createdAt: Date;
  status: 'processing' | 'completed' | 'failed';
  progress: ProgressState;
  results: MatchResult[];
  error?: string;
}

export interface SummaryStats {
  totalJobs: number;
  suitableJobs: number;
  averageScore: number;
  suitabilityPercentage: number;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
