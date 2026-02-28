// Core data structures for the AI Job Fit Analyzer

/**
 * Represents a job listing scraped from a career page
 */
export interface JobListing {
  jobId: string;
  jobTitle: string;
  location: string;
  requiredExperience: number;
  requiredSkills: string[];
  description: string;
  applyUrl: string;
  scrapedAt?: Date;
}

/**
 * Represents a candidate's profile extracted from their resume
 */
export interface CandidateProfile {
  skills: string[];
  yearsOfExperience: number;
  technologies: string[];
  previousRoles: string[];
  rawText: string;
  parsedAt?: Date;
}

/**
 * Represents the result of matching a candidate with a job
 */
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
  analyzedAt?: Date;
}

/**
 * Represents the current progress of an analysis session
 */
export interface ProgressState {
  currentJob: number;
  totalJobs: number;
  operation: 'scraping' | 'parsing' | 'matching' | 'completed';
  estimatedTimeRemaining?: number;
}

/**
 * Represents a session's data stored in memory
 */
export interface SessionData {
  sessionId: string;
  createdAt: Date;
  status: 'processing' | 'completed' | 'failed';
  progress: ProgressState;
  results: MatchResult[];
  error?: string;
}

/**
 * Parameters for initiating a job analysis
 */
export interface AnalysisParams {
  careerPageUrl: string;
  resumeFile: Buffer;
  maxJobs: number;
  matchThreshold: number;
  openAiApiKey?: string;
}

/**
 * Summary statistics for match results
 */
export interface SummaryStats {
  totalJobs: number;
  suitableJobs: number;
  averageScore: number;
  suitabilityPercentage: number;
}

/**
 * Validation error with field context
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Service error with retry information
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}
