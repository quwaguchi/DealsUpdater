# ZipAir Flight Monitor

Automated flight availability monitoring system for ZipAir Tokyo (NRT) to Vancouver (YVR) flights in August 2026.

## Overview

This system:
- 🕷️ **Scrapes** ZipAir website using Playwright, leveraging **API Interception** for robust data extraction.
- 🔍 **Detects** availability for "Standard" flights in August 2026.
- 📧 **Notifies** via Gmail SMTP when new available dates or price changes are detected.
- ⏰ **Runs** on schedule via GitHub Actions (every hour at :30).
- 💾 **Stores** state in Git-tracked `data/last_check.json` to avoid redundant notifications.

## Target Flight

- **Route**: Tokyo (NRT) → Vancouver (YVR)
- **Month**: August 2026
- **Fare Class**: Standard

## Technology Stack

- **Language**: TypeScript with Node.js
- **Web Scraping**: Playwright (with API response interception)
- **Email**: Nodemailer (Gmail SMTP)
- **Automation**: GitHub Actions (scheduled workflow)
- **State Management**: JSON file (git-tracked)

## Setup Instructions

### Prerequisites

- Node.js 20+ (for local development)
- npm or yarn
- Gmail account with app password
- GitHub repository

### 1. Install Dependencies

```bash
cd ZipAir
npm install
```

### 2. Configure Gmail Credentials

#### Get Gmail App Password

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Generate an **App Password** for "Mail"
4. Copy the 16-character app password

#### Add GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Create the following secrets:
   - `GMAIL_USER`: Your Gmail address
   - `GMAIL_PASS`: Your 16-character Gmail app password
   - `RECIPIENT_EMAIL`: The email address where you want to receive notifications

### 3. (Optional) Local Testing

Create a `.env` file in the `ZipAir` directory:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
RECIPIENT_EMAIL=your-target-email@gmail.com
```

Run the monitoring script:

```bash
npm run dev
```

## File Structure

```
ZipAir/
├── src/
│   ├── index.ts           # Main orchestration script
│   ├── scraper.ts         # Playwright scraper with API interception
│   ├── state.ts           # State management and change detection
│   ├── mailer.ts          # Email notification service
│   └── types.ts           # TypeScript type definitions
├── data/
│   └── last_check.json    # State file (git-tracked)
├── .github/
│   └── workflows/
│       └── zipair_monitor.yml # GitHub Actions workflow
├── package.json
├── tsconfig.json
└── .gitignore
```

## How It Works

### 1. Scraping (API Interception)
- Uses Playwright to navigate the ZipAir website.
- Performs UI actions (selecting One Way, NRT, YVR, and navigating to August 2026).
- Intercepts background API calls to `api/search/calendar` or similar endpoints.
- Extracts dates and prices directly from the JSON responses, which is more reliable than DOM scraping.

### 2. Change Detection
- Compares the current available dates and prices with the previous run.
- Triggers notification if a new date becomes available or if the price of an existing date changes.

### 3. Email Notification
- Sends a formatted HTML email containing the list of available dates and their prices.
- Includes a direct link to the ZipAir website for quick booking.

### 4. State Persistence
- Updates `data/last_check.json` after each successful run.
- GitHub Actions commits and pushes the updated state file back to the repository.

## GitHub Actions Workflow

The workflow file (`.github/workflows/zipair_monitor.yml`):

- **Schedule**: Runs every hour at 30 minutes past the hour (`30 * * * *`).
- **Trigger**: Can be manually triggered via the "Actions" tab in GitHub (**workflow_dispatch**).
- **Steps**:
  1. Checkout code
  2. Setup Node.js 20
  3. Install dependencies
  4. Install Playwright (Chromium only)
  5. Run monitoring script with environment variables
  6. Commit and push `data/last_check.json`
  7. Notify on failure

## Troubleshooting

- **No emails**: Check GitHub Secrets and verify the Gmail App Password.
- **Scraper failure**: ZipAir might update its site structure or API endpoints. Check the workflow logs and the `scraper-error.png` (if generated) in the workspace.
- **Permission issues**: Ensure the GitHub Action has "Read and write permissions" under Settings > Actions > General > Workflow permissions.

## License

MIT
