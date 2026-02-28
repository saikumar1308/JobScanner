import OpenAI from 'openai';
import { CandidateProfile, JobListing, MatchResult, ServiceError } from '../types';

/**
 * Configuration for the AI Matching Engine
 */
interface MatchingConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo';
  temperature: number;
  maxTokens: number;
  batchSize: number;
  batchDelay: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: MatchingConfig = {
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  maxTokens: 1000,
  batchSize: 3,
  batchDelay: 2000,
  maxRetries: 3,
};

/**
 * AI Matching Engine Service
 * Uses OpenAI API to evaluate candidate-job compatibility
 */
export class AIMatchingEngine {
  private openai: OpenAI;
  private config: MatchingConfig;

  constructor(apiKey: string, config: Partial<MatchingConfig> = {}) {
    this.openai = new OpenAI({ apiKey });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Match a candidate profile against multiple job listings
   * @param profile - The candidate's profile
   * @param jobs - Array of job listings to match against
   * @param threshold - Minimum score for a job to be considered suitable
   * @returns Array of match results sorted by score descending
   */
  async matchJobs(
    profile: CandidateProfile,
    jobs: JobListing[],
    threshold: number
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    
    // Process jobs in batches
    for (let i = 0; i < jobs.length; i += this.config.batchSize) {
      const batch = jobs.slice(i, i + this.config.batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(job => 
        this.matchSingleJob(profile, job, threshold)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches (except after last batch)
      if (i + this.config.batchSize < jobs.length) {
        await this.delay(this.config.batchDelay);
      }
    }
    
    // Sort by match score descending
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Match a single job with retry logic
   */
  private async matchSingleJob(
    profile: CandidateProfile,
    job: JobListing,
    threshold: number
  ): Promise<MatchResult> {
    let lastError: Error | null = null;
    
    // Retry up to maxRetries times
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.performMatch(profile, job, threshold);
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Match attempt ${attempt}/${this.config.maxRetries} failed for job ${job.jobId}:`,
          error instanceof Error ? error.message : error
        );
        
        // Don't delay after last attempt
        if (attempt < this.config.maxRetries) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    // All retries failed - return default result with score 0
    console.error(
      `All retry attempts failed for job ${job.jobId}. Assigning score 0.`,
      lastError
    );
    
    return {
      jobId: job.jobId,
      jobTitle: job.jobTitle,
      location: job.location,
      requiredExperience: job.requiredExperience,
      matchScore: 0,
      suitable: false,
      missingSkills: [],
      experienceGap: 0,
      reasoning: 'Analysis failed after multiple attempts. Please try again.',
      applyUrl: job.applyUrl,
      analyzedAt: new Date(),
    };
  }

  /**
   * Perform the actual matching using OpenAI API
   */
  private async performMatch(
    profile: CandidateProfile,
    job: JobListing,
    threshold: number
  ): Promise<MatchResult> {
    const prompt = this.generatePrompt(profile, job);
    
    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical recruiter with deep knowledge of software engineering roles, skills, and career progression.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new ServiceError(
        'OpenAI API returned empty response',
        'ai-matching',
        'EMPTY_RESPONSE',
        true
      );
    }
    
    // Parse and validate JSON response
    const matchData = this.parseAndValidateResponse(content);
    
    // Construct final result
    return {
      jobId: job.jobId,
      jobTitle: job.jobTitle,
      location: job.location,
      requiredExperience: job.requiredExperience,
      matchScore: matchData.matchScore,
      suitable: matchData.matchScore >= threshold,
      missingSkills: matchData.missingSkills,
      experienceGap: matchData.experienceGap,
      reasoning: matchData.reasoning,
      applyUrl: job.applyUrl,
      analyzedAt: new Date(),
    };
  }

  /**
   * Generate structured prompt for OpenAI
   */
  private generatePrompt(profile: CandidateProfile, job: JobListing): string {
    return `Analyze the fit between this candidate and job posting.

CANDIDATE PROFILE:
${JSON.stringify({
  skills: profile.skills,
  yearsOfExperience: profile.yearsOfExperience,
  technologies: profile.technologies,
  previousRoles: profile.previousRoles,
}, null, 2)}

JOB DESCRIPTION:
${job.description}

REQUIRED SKILLS: ${job.requiredSkills.join(', ')}
REQUIRED EXPERIENCE: ${job.requiredExperience} years

Provide a JSON response with the following structure:
{
  "matchScore": <number between 0-100>,
  "suitable": <boolean>,
  "missingSkills": [<array of skills the candidate lacks>],
  "experienceGap": <years difference, negative if candidate exceeds requirement>,
  "reasoning": "<2-3 sentence explanation of the match assessment>"
}

Important: Return ONLY valid JSON, no additional text.`;
  }

  /**
   * Parse and validate the OpenAI response
   */
  private parseAndValidateResponse(content: string): {
    matchScore: number;
    suitable: boolean;
    missingSkills: string[];
    experienceGap: number;
    reasoning: string;
  } {
    let parsed: any;
    
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new ServiceError(
        'Failed to parse OpenAI response as JSON',
        'ai-matching',
        'INVALID_JSON',
        true
      );
    }
    
    // Validate response structure
    if (
      typeof parsed.matchScore !== 'number' ||
      parsed.matchScore < 0 ||
      parsed.matchScore > 100
    ) {
      throw new ServiceError(
        'Invalid matchScore in response',
        'ai-matching',
        'INVALID_MATCH_SCORE',
        true
      );
    }
    
    if (typeof parsed.suitable !== 'boolean') {
      throw new ServiceError(
        'Invalid suitable field in response',
        'ai-matching',
        'INVALID_SUITABLE',
        true
      );
    }
    
    if (!Array.isArray(parsed.missingSkills)) {
      throw new ServiceError(
        'Invalid missingSkills in response',
        'ai-matching',
        'INVALID_MISSING_SKILLS',
        true
      );
    }
    
    if (typeof parsed.experienceGap !== 'number') {
      throw new ServiceError(
        'Invalid experienceGap in response',
        'ai-matching',
        'INVALID_EXPERIENCE_GAP',
        true
      );
    }
    
    if (typeof parsed.reasoning !== 'string' || parsed.reasoning.length === 0) {
      throw new ServiceError(
        'Invalid reasoning in response',
        'ai-matching',
        'INVALID_REASONING',
        true
      );
    }
    
    return {
      matchScore: parsed.matchScore,
      suitable: parsed.suitable,
      missingSkills: parsed.missingSkills,
      experienceGap: parsed.experienceGap,
      reasoning: parsed.reasoning,
    };
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create an AI Matching Engine instance
 */
export function createAIMatchingEngine(
  apiKey: string,
  config?: Partial<MatchingConfig>
): AIMatchingEngine {
  return new AIMatchingEngine(apiKey, config);
}
