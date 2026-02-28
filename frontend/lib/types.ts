// Frontend type definitions
// These will be populated in subsequent tasks

export interface AnalysisParams {
  careerPageUrl: string;
  resumeFile: File;
  maxJobs: number;
  matchThreshold: number;
}

export interface ProgressState {
  currentJob: number;
  totalJobs: number;
  operation: 'scraping' | 'parsing' | 'matching';
  estimatedTimeRemaining: number;
}

export interface UserSettings {
  openAiApiKey: string;
  defaultMaxJobs: number;
  defaultMatchThreshold: number;
}
