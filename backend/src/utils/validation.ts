import { ValidationError } from '../types';

/**
 * Validation utilities for input sanitization and validation
 */

/**
 * Validates a URL for security and format
 * @param url - The URL to validate
 * @throws ValidationError if URL is invalid
 */
export function validateUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError(
      'URL is required and must be a string',
      'url',
      'INVALID_URL'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new ValidationError(
      'Invalid URL format',
      'url',
      'INVALID_URL_FORMAT'
    );
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError(
      'URL must use HTTP or HTTPS protocol',
      'url',
      'INVALID_PROTOCOL'
    );
  }

  // Prevent localhost and private IPs in production
  if (process.env.NODE_ENV === 'production') {
    const hostname = parsed.hostname.toLowerCase();
    
    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      throw new ValidationError(
        'Localhost URLs are not allowed in production',
        'url',
        'LOCALHOST_NOT_ALLOWED'
      );
    }
    
    // Check for private IP ranges
    if (
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      throw new ValidationError(
        'Private IP addresses are not allowed',
        'url',
        'PRIVATE_IP_NOT_ALLOWED'
      );
    }
  }

  // Check for potential injection attacks
  const dangerousPatterns = [
    'javascript:',
    'data:',
    'file:',
    'vbscript:',
    '<script',
    'onerror=',
    'onclick=',
  ];

  const urlString = url.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (urlString.includes(pattern)) {
      throw new ValidationError(
        'URL contains potentially dangerous content',
        'url',
        'DANGEROUS_URL'
      );
    }
  }
}

/**
 * Validates a PDF file
 * @param file - The file object to validate
 * @param fileBuffer - The file buffer to check magic bytes
 * @throws ValidationError if file is invalid
 */
export function validatePdfFile(
  file: { mimetype: string; size: number; name: string },
  fileBuffer: Buffer
): void {
  // Check MIME type
  if (file.mimetype !== 'application/pdf') {
    throw new ValidationError(
      'Only PDF files are allowed',
      'resumeFile',
      'INVALID_FILE_TYPE'
    );
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    throw new ValidationError(
      'File size must not exceed 10MB',
      'resumeFile',
      'FILE_TOO_LARGE'
    );
  }

  // Check file size is not zero
  if (file.size === 0) {
    throw new ValidationError(
      'File is empty',
      'resumeFile',
      'EMPTY_FILE'
    );
  }

  // Check PDF magic bytes (PDF signature)
  // PDF files start with %PDF-
  if (fileBuffer.length < 5) {
    throw new ValidationError(
      'File is too small to be a valid PDF',
      'resumeFile',
      'INVALID_PDF'
    );
  }

  const header = fileBuffer.slice(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    throw new ValidationError(
      'Invalid PDF file - missing PDF signature',
      'resumeFile',
      'INVALID_PDF_SIGNATURE'
    );
  }
}

/**
 * Validates a numeric value is within a specified range
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @throws ValidationError if value is out of range
 */
export function validateNumericRange(
  value: any,
  fieldName: string,
  min: number,
  max: number
): void {
  // Check if value is a number
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    throw new ValidationError(
      `${fieldName} must be a valid number`,
      fieldName,
      'INVALID_NUMBER'
    );
  }

  // Check if value is an integer
  if (!Number.isInteger(numValue)) {
    throw new ValidationError(
      `${fieldName} must be an integer`,
      fieldName,
      'NOT_INTEGER'
    );
  }

  // Check range
  if (numValue < min || numValue > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName,
      'OUT_OF_RANGE'
    );
  }
}

/**
 * Validates maxJobs parameter
 * @param maxJobs - The maximum number of jobs to scrape
 * @throws ValidationError if invalid
 */
export function validateMaxJobs(maxJobs: any): void {
  validateNumericRange(maxJobs, 'maxJobs', 1, 100);
}

/**
 * Validates match threshold parameter
 * @param threshold - The match threshold percentage
 * @throws ValidationError if invalid
 */
export function validateThreshold(threshold: any): void {
  validateNumericRange(threshold, 'threshold', 0, 100);
}

/**
 * Validates all required fields are present
 * @param fields - Object containing field names and values
 * @throws ValidationError if any required field is missing
 */
export function validateRequiredFields(fields: Record<string, any>): void {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(
        `${fieldName} is required`,
        fieldName,
        'REQUIRED_FIELD'
      );
    }
  }
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates OpenAI API key format
 * @param apiKey - The API key to validate
 * @throws ValidationError if invalid
 */
export function validateApiKey(apiKey: string): void {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError(
      'OpenAI API key is required',
      'apiKey',
      'REQUIRED_FIELD'
    );
  }

  // Trim and check if empty
  const trimmedKey = apiKey.trim();
  if (trimmedKey.length === 0) {
    throw new ValidationError(
      'OpenAI API key cannot be empty',
      'apiKey',
      'EMPTY_API_KEY'
    );
  }

  // Basic format check (OpenAI keys typically start with 'sk-')
  if (!trimmedKey.startsWith('sk-')) {
    throw new ValidationError(
      'Invalid OpenAI API key format',
      'apiKey',
      'INVALID_API_KEY_FORMAT'
    );
  }

  // Check minimum length
  if (trimmedKey.length < 20) {
    throw new ValidationError(
      'OpenAI API key is too short',
      'apiKey',
      'INVALID_API_KEY_LENGTH'
    );
  }
}
