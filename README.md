# AI Job Fit Analyzer

An intelligent job matching system that automates the process of finding suitable job opportunities by analyzing resumes and career pages using AI.

## Features

- Automated career page scraping
- PDF resume parsing
- AI-powered job matching using OpenAI
- Real-time progress tracking
- Interactive results dashboard

## Technology Stack

### Frontend
- Next.js 14+ with App Router
- TypeScript
- Material UI v5+
- React 19

### Backend
- Node.js with Express.js
- TypeScript
- Puppeteer (web scraping)
- pdf-parse (resume parsing)
- OpenAI API (AI matching)

## Project Structure

```
.
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   └── lib/          # Utility functions and types
├── backend/          # Express.js backend API
│   └── src/
│       ├── controllers/  # Request handlers
│       ├── services/     # Business logic
│       ├── routes/       # API routes
│       ├── middleware/   # Express middleware
│       ├── utils/        # Helper functions
│       └── types/        # TypeScript type definitions
└── .kiro/            # Spec files
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd job-scanner
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL
npm run dev
```

The frontend will run on http://localhost:3000

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY and other configurations
npm run dev
```

The backend will run on http://localhost:3001

## Environment Variables

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)

### Backend (.env)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS allowed origins
- `OPENAI_API_KEY` - Your OpenAI API key
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window
- `MAX_FILE_SIZE_MB` - Maximum upload file size

## Development

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build
npm start

# Backend
cd backend
npm run build
npm start
```

## API Endpoints

- `POST /api/analyze` - Initiate job analysis
- `GET /api/progress/:sessionId` - Get analysis progress
- `GET /api/results/:sessionId` - Get match results

## License

ISC
