import puppeteer, { Browser, Page } from 'puppeteer';
import { JobListing, ServiceError } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for the scraping service
 */
interface ScrapingConfig {
  headless: boolean;
  timeout: number;
  delayBetweenRequests: number;
  userAgent: string;
}

const DEFAULT_CONFIG: ScrapingConfig = {
  headless: true,
  timeout: 30000,
  delayBetweenRequests: 1000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts job listing links from the career page
 */
async function extractJobLinks(page: Page): Promise<string[]> {
  try {
    // Wait for common job listing selectors
    await Promise.race([
      page.waitForSelector('a[href*="job"]', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('a[href*="career"]', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('a[href*="position"]', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('.job-listing', { timeout: 10000 }).catch(() => null),
      delay(10000)
    ]);

    // Extract all links that might be job listings
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const jobLinks = anchors
        .map((a: any) => a.href)
        .filter((href: string) => 
          href && (
            href.includes('/job') ||
            href.includes('/career') ||
            href.includes('/position') ||
            href.includes('/opening')
          )
        );
      
      // Remove duplicates
      return Array.from(new Set(jobLinks));
    });

    return links;
  } catch (error) {
    console.warn('Failed to extract job links:', error);
    return [];
  }
}

/**
 * Extracts job details from a job detail page
 */
async function extractJobDetails(page: Page, jobUrl: string): Promise<JobListing | null> {
  try {
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: DEFAULT_CONFIG.timeout });

    const jobDetails = await page.evaluate(() => {
      // Helper function to extract text from common selectors
      const getText = (selectors: string[]): string => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            return element.textContent.trim();
          }
        }
        return '';
      };

      // Extract job title
      const title = getText([
        'h1',
        '.job-title',
        '[class*="title"]',
        '[class*="job-name"]',
        'header h1',
        'header h2'
      ]);

      // Extract location
      const location = getText([
        '[class*="location"]',
        '[class*="office"]',
        '[data-test*="location"]',
        '.job-location',
        'span:has-text("Location")',
        'div:has-text("Location")'
      ]) || 'Not specified';

      // Extract description
      const description = getText([
        '[class*="description"]',
        '[class*="job-content"]',
        '.job-details',
        'article',
        'main'
      ]) || document.body.innerText;

      // Extract experience (look for patterns like "5 years", "5+ years", "3-5 years")
      const experienceMatch = description.match(/(\d+)[\+\-\s]*(?:to\s*)?(\d+)?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience)?/i);
      let requiredExperience = 0;
      if (experienceMatch) {
        requiredExperience = parseInt(experienceMatch[1], 10);
      }

      // Extract skills (look for common skill section headers)
      const skillsText = getText([
        '[class*="skill"]',
        '[class*="requirement"]',
        '[class*="qualification"]',
        'section:has-text("Skills")',
        'section:has-text("Requirements")',
        'div:has-text("Qualifications")'
      ]) || description;

      // Common tech skills to look for
      const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP',
        'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
        'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
        'REST', 'GraphQL', 'API', 'Microservices', 'Agile', 'Scrum'
      ];

      const requiredSkills = commonSkills.filter(skill => 
        skillsText.toLowerCase().includes(skill.toLowerCase()) ||
        description.toLowerCase().includes(skill.toLowerCase())
      );

      return {
        title,
        location,
        description: description.substring(0, 5000), // Limit description length
        requiredExperience,
        requiredSkills
      };
    });

    // Validate that we got at least a title
    if (!jobDetails.title) {
      console.warn(`No title found for job at ${jobUrl}`);
      return null;
    }

    const jobListing: JobListing = {
      jobId: uuidv4(),
      jobTitle: jobDetails.title,
      location: jobDetails.location,
      requiredExperience: jobDetails.requiredExperience,
      requiredSkills: jobDetails.requiredSkills,
      description: jobDetails.description,
      applyUrl: jobUrl,
      scrapedAt: new Date()
    };

    return jobListing;
  } catch (error) {
    console.error(`Failed to extract job details from ${jobUrl}:`, error);
    return null;
  }
}

/**
 * Scrapes job listings from a career page
 * 
 * @param url - The career page URL to scrape
 * @param maxJobs - Maximum number of jobs to scrape (1-100)
 * @param config - Optional scraping configuration
 * @returns Array of job listings
 * @throws ServiceError if scraping fails critically
 */
export async function scrapeCareerPage(
  url: string,
  maxJobs: number = 10,
  config: Partial<ScrapingConfig> = {}
): Promise<JobListing[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let browser: Browser | null = null;

  try {
    console.log(`Starting scrape of ${url} for up to ${maxJobs} jobs`);

    // Initialize Puppeteer browser
    browser = await puppeteer.launch({
      headless: finalConfig.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent(finalConfig.userAgent);
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to career page
    console.log('Navigating to career page...');
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: finalConfig.timeout 
    });

    // Extract job listing links
    console.log('Extracting job links...');
    const jobLinks = await extractJobLinks(page);
    
    if (jobLinks.length === 0) {
      throw new ServiceError(
        'No job listings found on the career page',
        'scraping',
        'NO_JOBS_FOUND',
        false
      );
    }

    console.log(`Found ${jobLinks.length} job links, processing up to ${maxJobs}...`);

    // Limit to maxJobs
    const linksToProcess = jobLinks.slice(0, maxJobs);
    const jobListings: JobListing[] = [];

    // Process each job link
    for (let i = 0; i < linksToProcess.length; i++) {
      const jobLink = linksToProcess[i];
      console.log(`Processing job ${i + 1}/${linksToProcess.length}: ${jobLink}`);

      try {
        const jobDetails = await extractJobDetails(page, jobLink);
        
        if (jobDetails) {
          jobListings.push(jobDetails);
          console.log(`Successfully scraped: ${jobDetails.jobTitle}`);
        } else {
          console.warn(`Failed to extract details for job at ${jobLink}`);
        }
      } catch (error) {
        // Handle individual job failures gracefully - log and continue
        console.error(`Error processing job ${jobLink}:`, error);
      }

      // Add delay between requests (except after the last one)
      if (i < linksToProcess.length - 1) {
        await delay(finalConfig.delayBetweenRequests);
      }
    }

    console.log(`Scraping complete. Successfully scraped ${jobListings.length} jobs.`);

    if (jobListings.length === 0) {
      throw new ServiceError(
        'Failed to extract details from any job listings',
        'scraping',
        'EXTRACTION_FAILED',
        true
      );
    }

    return jobListings;

  } catch (error) {
    // Handle critical errors
    if (error instanceof ServiceError) {
      throw error;
    }

    // Check for common error patterns
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || 
          error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        throw new ServiceError(
          'Unable to reach the career page. Please check the URL.',
          'scraping',
          'CONNECTION_FAILED',
          true
        );
      }

      if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        throw new ServiceError(
          'Career page took too long to load. Please try again.',
          'scraping',
          'TIMEOUT',
          true
        );
      }

      if (error.message.includes('blocked') || error.message.includes('403')) {
        throw new ServiceError(
          'Career page blocked the scraper. Try a different page.',
          'scraping',
          'BLOCKED',
          false
        );
      }
    }

    // Generic error
    throw new ServiceError(
      'Failed to scrape career page',
      'scraping',
      'SCRAPING_FAILED',
      true
    );

  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}
