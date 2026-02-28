// Frontend type definitions for the AI Job Fit Analyzer

/**
 * Represents a job listing
 */
export interface JobListing {
  jobId: string;
  jobTitle: string;
  location: string;
  requiredExperience: number;
  requiredSkills: string[];
  description: string;
  applyUrl: string;
  scrapedAt?: string;
}

/**
 * Represents a candidate's profile
 */
export interface CandidateProfile {
  skills: string[];
  yearsOfExperience: number;
  technologies: string[];
  previousRoles: string[];
  rawText: string;
  parsedAt?: string;
}

/**
 * Represents a job match result
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
  analyzedAt?: string;
}

/**
 * Progress state for an analysis session
 */
export interface ProgressState {
  currentJob: number;
  totalJobs: number;
  operation: 'scraping' | 'parsing' | 'matching' | 'completed';
  estimatedTimeRemaining?: number;
}

/**
 * Session status information
 */
export interface SessionData {
  sessionId: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  progress: ProgressState;
  results: MatchResult[];
  error?: string;
}

/**
 * Parameters for initiating analysis
 */
export interface AnalysisParams {
  careerPageUrl: string;
  resumeFile: File;
  maxJobs: number;
  matchThreshold: number;
}

/**
 * User settings stored in localStorage
 */
export interface UserSettings {
  openAiApiKey: string;
  defaultMaxJobs: number;
  defaultMatchThreshold: number;
}

/**
 * Summary statistics for results
 */
export interface SummaryStats {
  totalJobs: number;
  suitableJobs: number;
  averageScore: number;
  suitabilityPercentage: number;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  code: string;
  field?: string;
}

/**
 * API response for analysis initiation
 */
export interface AnalysisResponse {
  sessionId: string;
}

/**
 * API response for results
 */
export interface ResultsResponse {
  results: MatchResult[];
  stats: SummaryStats;
}
