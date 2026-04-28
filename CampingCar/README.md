# Relocation Specials Monitor

Automated web scraping system that monitors two RV rental websites for new "Relocation Specials" offers and sends email notifications when new offers are found.

## Overview

This system:
- 🕷️ **Scrapes** two RV rental websites using Playwright (handles dynamic content)
- 🔍 **Detects** new offers by comparing with previous state (hash-based diff detection)
- 📧 **Notifies** via Gmail SMTP when new offers are found
- ⏰ **Runs** on schedule via GitHub Actions (hourly)
- 💾 **Stores** state in Git-tracked `data/last_check.json` for persistence

## Monitored Websites

1. **Canadream**: https://www.canadream.com/special-offers/relocation-specials/
2. **FraserWay**: https://rent.fraserway.com/en/rv/rental-specials/relocation-specials/

## Technology Stack

- **Language**: TypeScript with Node.js
- **Web Scraping**: Playwright (supports dynamic content)
- **Email**: Nodemailer (Gmail SMTP)
- **Automation**: GitHub Actions (scheduled workflow)
- **State Management**: JSON file (git-tracked)

## Setup Instructions

### Prerequisites

- Node.js 18+ (for local development)
- npm or yarn
- Gmail account with app password
- GitHub repository

### 1. Install Dependencies

```bash
cd CampingCar
npm install
```

### 2. Configure Gmail Credentials

#### Get Gmail App Password

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Generate an **App Password** for "Mail" / "Windows Computer" (or similar)
4. Copy the 16-character app password

#### Add GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Create two new secrets:
   - `GMAIL_USER`: Your Gmail address (e.g., `kawaguchi8656@gmail.com`)
   - `GMAIL_PASS`: Your 16-character Gmail app password

### 3. (Optional) Local Testing

Create a `.env` file in the `CampingCar` directory:

```env
GMAIL_USER
GMAIL_PASS
RECIPIENT_EMAIL
```

Run the monitoring script:

```bash
npm run dev
```

To build:

```bash
npm run build
node dist/index.ts
```

## File Structure

```
CampingCar/
├── src/
│   ├── index.ts           # Main orchestration script
│   ├── scraper.ts         # Playwright scrapers for both websites
│   ├── state.ts           # State management and diff detection
│   ├── mailer.ts          # Email notification service
│   └── types.ts           # TypeScript type definitions
├── data/
│   └── last_check.json    # State file (git-tracked)
├── .github/
│   └── workflows/
│       └── monitor.yml    # GitHub Actions workflow
├── package.json
├── tsconfig.json
└── .gitignore
```

## How It Works

### 1. Scraping
- Uses Playwright to load each website
- Waits for JavaScript to render dynamic content
- Extracts offer details:
  - Departure location
  - Destination location
  - Start date
  - End date
  - Price
  - Vehicle information

### 2. Diff Detection
- Creates a hash from `departure + destination + startDate` for each offer
- Compares hashes with previous run's state
- Identifies new offers (not in previous state)

### 3. Email Notification
- Only sends email if new offers are found
- Formats offers by source website (Canadream vs FraserWay)
- Includes all relevant details in HTML email

### 4. State Persistence
- Updates `data/last_check.json` with latest offers after each run
- GitHub Actions automatically commits and pushes changes
- Prevents duplicate notifications for same offers

## GitHub Actions Workflow

The workflow file (`.github/workflows/monitor.yml`):

- **Schedule**: Runs every hour at the top of the hour (`0 * * * *`)
- **Trigger**: Can also be manually triggered via `workflow_dispatch`
- **Steps**:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies
  4. Install Playwright browsers and dependencies
  5. Run monitoring script
  6. Commit and push state updates
  7. Notify on failure

## Email Notification Format

Email includes:
- 🚐 Subject line with new offer count
- Offers grouped by source website
- Details for each offer:
  - Route (departure → destination)
  - Period (start date ~ end date)
  - Price
  - Vehicle information
  - Scrape timestamp

## Troubleshooting

### No emails being sent

1. **Check GitHub Secrets**: Ensure `GMAIL_USER` and `GMAIL_PASS` are set correctly
2. **Verify Gmail credentials**: Test locally with `.env` file first
3. **Check workflow logs**: GitHub Actions → Actions tab → Recent runs
4. **Gmail app password**: Ensure it's a 16-character app password, not regular password

### Scraper not finding content

1. Website HTML structure may have changed - CSS selectors need updating
2. Check browser console for errors: `npm run dev` and review output
3. May need to adjust `waitForTimeout` values if pages load slowly

### State file not updating

1. Ensure workflow has write permissions (default in GitHub Actions)
2. Check workflow logs for git errors
3. Verify `.gitignore` doesn't exclude `data/` directory

## Customization

### Adjust Scraping Selectors

Edit `src/scraper.ts` and update the CSS selectors in the `page.evaluate()` functions:

```typescript
// Example: if HTML structure is different
const departure = element.querySelector('.offer-from')?.textContent?.trim() || '';
```

### Change Notification Email

Edit `src/mailer.ts`:
- Modify `RECIPIENT_EMAIL` constant
- Adjust HTML template in `formatEmailBody()` function

### Adjust Schedule

Edit `.github/workflows/monitor.yml`:

```yaml
on:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours instead of every hour
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GMAIL_USER` | Yes | Gmail address for sending notifications |
| `GMAIL_PASS` | Yes | Gmail app password (16 characters) |

## Security

- ✅ Credentials stored in GitHub Secrets (not in code)
- ✅ `.env` file in `.gitignore` for local testing
- ✅ No sensitive data logged to console
- ✅ Uses Gmail's OAuth-like app password (safer than storing actual password)

## License

MIT

## Support

For issues or questions, check:
1. Workflow logs in GitHub Actions
2. Local testing output: `npm run dev`
3. Website structure hasn't changed
