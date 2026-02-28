import pdfParse from 'pdf-parse';
import { CandidateProfile, ServiceError } from '../types/index.js';

// Type definition for pdf-parse
type PdfParseFunction = (dataBuffer: Buffer) => Promise<{ text: string; numpages: number; info: any }>;
const pdf = pdfParse as unknown as PdfParseFunction;

/**
 * Common technology keywords to identify in resumes
 */
const TECHNOLOGY_KEYWORDS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust',
  'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell', 'Bash',
  // Frontend
  'React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Nuxt', 'HTML', 'CSS', 'SASS',
  'LESS', 'Tailwind', 'Bootstrap', 'Material UI', 'jQuery', 'Webpack', 'Vite',
  // Backend
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'ASP.NET',
  'Rails', 'Laravel', 'NestJS', 'Fastify',
  // Databases
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB',
  'Cassandra', 'Oracle', 'SQL Server', 'SQLite', 'MariaDB',
  // Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI',
  'GitHub Actions', 'Terraform', 'Ansible', 'CircleCI', 'Travis CI',
  // Tools & Others
  'Git', 'GraphQL', 'REST', 'gRPC', 'Microservices', 'CI/CD', 'Agile', 'Scrum',
  'TDD', 'Jest', 'Mocha', 'Pytest', 'JUnit', 'Selenium', 'Cypress'
];

/**
 * Common skill keywords to identify in resumes
 */
const SKILL_KEYWORDS = [
  'leadership', 'communication', 'problem solving', 'teamwork', 'project management',
  'analytical', 'critical thinking', 'collaboration', 'mentoring', 'architecture',
  'design patterns', 'system design', 'debugging', 'testing', 'documentation',
  'code review', 'performance optimization', 'security', 'scalability', 'API design'
];

/**
 * Resume Parser Service
 * Extracts structured data from PDF resumes
 */
export class ResumeParser {
  /**
   * Parse a PDF resume and extract structured candidate profile
   * @param fileBuffer - Buffer containing PDF file data
   * @returns Structured CandidateProfile object
   */
  async parseResume(fileBuffer: Buffer): Promise<CandidateProfile> {
    try {
      // Extract text from PDF
      const data = await pdf(fileBuffer);
      const rawText = data.text;

      if (!rawText || rawText.trim().length === 0) {
        throw new ServiceError(
          'No text could be extracted from the PDF',
          'resume-parser',
          'EMPTY_PDF',
          false
        );
      }

      // Extract structured data
      const yearsOfExperience = this.extractYearsOfExperience(rawText);
      const skills = this.extractSkills(rawText);
      const technologies = this.extractTechnologies(rawText);
      const previousRoles = this.extractPreviousRoles(rawText);

      return {
        skills,
        yearsOfExperience,
        technologies,
        previousRoles,
        rawText,
        parsedAt: new Date()
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        `Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'resume-parser',
        'PARSING_FAILED',
        false
      );
    }
  }

  /**
   * Extract years of experience from resume text
   * Looks for patterns like "5 years", "5+ years", date ranges, etc.
   */
  private extractYearsOfExperience(text: string): number {
    const patterns = [
      // Direct mentions: "5 years of experience", "5+ years"
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
      /experience[:\s]+(\d+)\+?\s*years?/gi,
      // Date ranges in experience section
      /(\d{4})\s*[-–—]\s*(?:present|current|\d{4})/gi
    ];

    let maxYears = 0;

    // Try direct year mentions first
    for (const pattern of patterns.slice(0, 2)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const years = parseInt(match[1], 10);
        if (!isNaN(years) && years > maxYears && years <= 50) {
          maxYears = years;
        }
      }
    }

    // If no direct mention, calculate from date ranges
    if (maxYears === 0) {
      const dateRanges = text.matchAll(patterns[2]);
      const currentYear = new Date().getFullYear();
      
      for (const match of dateRanges) {
        const startYear = parseInt(match[1], 10);
        const endYearStr = match[0].match(/(\d{4})$/)?.[1];
        const endYear = endYearStr ? parseInt(endYearStr, 10) : currentYear;
        
        if (!isNaN(startYear) && startYear >= 1970 && startYear <= currentYear) {
          const duration = endYear - startYear;
          maxYears += duration;
        }
      }
    }

    return Math.min(maxYears, 50); // Cap at 50 years for sanity
  }

  /**
   * Extract skills from resume text
   * Looks for skills section and extracts relevant keywords
   */
  private extractSkills(text: string): string[] {
    const skills = new Set<string>();

    // Find skills section
    const skillsSectionRegex = /(?:^|\n)\s*(?:skills|technical skills|core competencies|expertise)[:\s]*\n([\s\S]*?)(?:\n\s*(?:experience|education|projects|certifications|$))/gi;
    const skillsMatch = skillsSectionRegex.exec(text);

    if (skillsMatch) {
      const skillsSection = skillsMatch[1];
      
      // Extract skills from section
      SKILL_KEYWORDS.forEach(skill => {
        const regex = new RegExp(`\\b${skill}\\b`, 'gi');
        if (regex.test(skillsSection)) {
          skills.add(skill.toLowerCase());
        }
      });

      // Also extract bullet points and comma-separated items
      const bulletPoints = skillsSection.match(/[•\-\*]\s*([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const cleaned = point.replace(/[•\-\*]\s*/, '').trim();
          if (cleaned.length > 2 && cleaned.length < 50) {
            skills.add(cleaned.toLowerCase());
          }
        });
      }
    }

    // Fallback: search entire document for skill keywords
    if (skills.size === 0) {
      SKILL_KEYWORDS.forEach(skill => {
        const regex = new RegExp(`\\b${skill}\\b`, 'gi');
        if (regex.test(text)) {
          skills.add(skill.toLowerCase());
        }
      });
    }

    return Array.from(skills);
  }

  /**
   * Extract technologies from resume text
   * Matches against known technology keywords
   */
  private extractTechnologies(text: string): string[] {
    const technologies = new Set<string>();

    TECHNOLOGY_KEYWORDS.forEach(tech => {
      // Case-insensitive word boundary match
      const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(text)) {
        technologies.add(tech);
      }
    });

    return Array.from(technologies);
  }

  /**
   * Extract previous roles/job titles from resume text
   * Looks for common job title patterns in experience section
   */
  private extractPreviousRoles(text: string): string[] {
    const roles = new Set<string>();

    // Common job title keywords
    const titleKeywords = [
      'engineer', 'developer', 'architect', 'manager', 'lead', 'senior', 'junior',
      'principal', 'staff', 'director', 'analyst', 'consultant', 'specialist',
      'administrator', 'designer', 'scientist', 'researcher', 'intern', 'coordinator',
      'technician', 'programmer', 'cto', 'ceo', 'vp', 'head of'
    ];

    // Split into lines and look for role patterns
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines or very long lines (likely descriptions)
      if (line.length === 0 || line.length > 100) continue;

      // Check if line contains job title keywords
      const lowerLine = line.toLowerCase();
      const hasKeyword = titleKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasKeyword) {
        // Check if next line looks like a date range (indicates this is a job title)
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        const hasDatePattern = /\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(nextLine);
        
        if (hasDatePattern || /\d{4}/.test(line)) {
          // Clean up the role title
          let role = line
            .replace(/\d{4}\s*[-–—]\s*(?:present|current|\d{4})/gi, '') // Remove date ranges
            .replace(/[•\-\*]\s*/, '') // Remove bullets
            .replace(/\s+at\s+.+$/i, '') // Remove "at Company"
            .replace(/\s*[,|]\s*.+$/, '') // Remove company after comma or pipe
            .trim();
          
          if (role.length > 3 && role.length < 80) {
            roles.add(role);
          }
        }
      }
    }

    return Array.from(roles);
  }
}

// Export singleton instance
export const resumeParser = new ResumeParser();
