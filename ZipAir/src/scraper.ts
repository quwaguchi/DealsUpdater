import { chromium, Response } from 'playwright';
import { FlightOffer } from './types';

const ZIPAIR_URL = 'https://www.zipair.net/en';

export async function scrapeZipAir(): Promise<FlightOffer[]> {
  console.log('[Scraper] Starting ZipAir scraper...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Vancouver',
  });
  const page = await context.newPage();
  
  const flightOffers: FlightOffer[] = [];

  try {
    // Listen for API responses
    page.on('response', async (response: Response) => {
      const url = response.url();
      if (url.includes('/api/search/calendar') || url.includes('/api/v1/fare/calendar') || url.includes('booking/calendar')) {
        try {
          if (response.status() === 200) {
            const data = await response.json();
            extractOffersFromData(data, flightOffers);
          }
        } catch (e) {}
      }
    });

    console.log('[Scraper] Navigating to ZipAir...');
    await page.goto(ZIPAIR_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    // Clear cookies and storage just in case, though context is fresh
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    
    // Reload to ensure a clean state
    await page.goto(ZIPAIR_URL, { waitUntil: 'networkidle', timeout: 90000 });
    console.log('[Scraper] Page loaded/reloaded. Title:', await page.title());

    // Handle possible cookie consent, country selection, or language popups
    console.log('[Scraper] Handling potential blocking modals...');
    const closeButtons = [
      'button:has-text("Accept")',
      'button:has-text("OK")',
      'button:has-text("Close")',
      '.cookie-consent-button',
      '.modal-close',
      '.close-button',
      '[aria-label="Close"]'
    ];
    
    for (const selector of closeButtons) {
      await page.click(selector, { timeout: 2000 }).catch(() => {});
    }

    // Special handling for language/region selection which often appears on first visit
    await page.click('button:has-text("United States"), button:has-text("Global")').catch(() => {});

    // 1. Select "One Way"
    console.log('[Scraper] Selecting One Way...');
    // ZipAir's search form might take a moment to be interactive
    await page.waitForTimeout(3000); 

    const oneWaySelectors = [
      'text="One Way"',
      'text="One way"',
      'label:has-text("One Way")',
      'label:has-text("One way")',
      '[for*="oneWay"]'
    ];

    let found = false;
    for (const selector of oneWaySelectors) {
      if (await page.locator(selector).isVisible()) {
        console.log(`[Scraper] Found One Way via: ${selector}`);
        await page.click(selector);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[Scraper] One Way selector not found via standard list, trying broad search...');
      const labels = page.locator('label, button, span');
      const count = await labels.count();
      for (let i = 0; i < count; i++) {
        const text = await labels.nth(i).textContent();
        if (text?.toLowerCase().includes('one way')) {
          console.log(`[Scraper] Clicking element with text: ${text}`);
          await labels.nth(i).click();
          found = true;
          break;
        }
      }
    }

    if (!found) {
      await page.screenshot({ path: 'one-way-not-found.png' });
      throw new Error('Could not find One Way selection');
    }

    // 2. Set Origin "Tokyo"
    console.log('[Scraper] Setting Origin...');
    const originButton = page.locator('.origin-select-button, button:has-text("Origin"), [data-testid="origin-select"], .origin-select');
    await originButton.first().click().catch(() => console.log('[Scraper] Origin button click failed, trying anyway...'));
    
    const originInput = page.locator('input[placeholder*="Origin"], input[placeholder*="From"], .origin-input input');
    await originInput.first().fill('Tokyo');
    await page.waitForTimeout(1500); // Wait for results to appear
    
    const originResult = page.locator('li:has-text("Tokyo"), .location-list-item:has-text("Tokyo"), [role="option"]:has-text("Tokyo")');
    await originResult.first().click();

    // 3. Set Destination "Vancouver"
    console.log('[Scraper] Setting Destination...');
    const destButton = page.locator('.destination-select-button, button:has-text("Destination"), [data-testid="destination-select"], .destination-select');
    await destButton.first().click().catch(() => {});
    
    const destInput = page.locator('input[placeholder*="Destination"], input[placeholder*="To"], .destination-input input');
    await destInput.first().fill('Vancouver');
    await page.waitForTimeout(1500);
    
    const destResult = page.locator('li:has-text("Vancouver"), .location-list-item:has-text("Vancouver"), [role="option"]:has-text("Vancouver")');
    await destResult.first().click();

    // 4. Click "Search Flight"
    console.log('[Scraper] Clicking Search Flight...');
    const searchButton = page.locator('button:has-text("Search Flight"), .search-button');
    await searchButton.waitFor({ state: 'visible', timeout: 15000 });
    await searchButton.click();

    // 5. Handle the first "Next" popup after Search Flight
    console.log('[Scraper] Handling first "Next" popup...');
    const firstNext = page.locator('button:has-text("Next"), .next-button').first();
    await firstNext.waitFor({ state: 'visible', timeout: 15000 });
    await firstNext.click();

    // 6. "Select Number of Passengers" screen - Click "Next" (Adult is usually 1 by default)
    console.log('[Scraper] Handling "Select Number of Passengers" screen...');
    await page.waitForTimeout(2000); // Small wait for transition
    const secondNext = page.locator('button:has-text("Next"), .next-button').first();
    await secondNext.waitFor({ state: 'visible', timeout: 15000 });
    await secondNext.click();

    // 7. On "Select Date" screen, wait for data to load
    console.log('[Scraper] Waiting for "Select Date" screen and calendar data...');
    await page.waitForSelector('.calendar, .date-selection-container, text=Select Date', { timeout: 30000 });

    // Loop to find August 2026
    let foundAugust = false;
    for (let i = 0; i < 24; i++) { // Max 24 months ahead
      const bodyText = await page.textContent('body');
      if (bodyText?.match(/August\s+2026|Aug\.\s+2026|Aug\s+2026/i)) {
        foundAugust = true;
        console.log('[Scraper] Found August 2026');
        break;
      }
      
      const nextMonthButton = page.locator('button:has-text("Next"), .next-month-button, .arrow-right, [aria-label*="Next month"]').first();
      if (await nextMonthButton.isVisible()) {
        await nextMonthButton.click();
        await page.waitForTimeout(1500); // Wait for API
      } else {
        console.log('[Scraper] Next month button not found, trying scroll...');
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(1000);
      }
    }

    if (!foundAugust) {
      console.error('[Scraper] Could not find August 2026 in the calendar');
    }

    // Wait a bit more for any final API responses
    await page.waitForTimeout(3000);

    return flightOffers.filter(offer => offer.date.startsWith('2026-08') && offer.isAvailable);

  } catch (error) {
    console.error('[Scraper] Error during scraping:', error);
    // In case of error, take a screenshot for debugging (optional in CI)
    await page.screenshot({ path: 'scraper-error.png' }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

function extractOffersFromData(data: any, offers: FlightOffer[]) {
  // ZipAir API response structure varies, but typically:
  // data.flights or data.calendar.days
  // This is a placeholder logic that needs to be refined based on the actual API response
  
  if (data && data.calendar) {
    // Example: ZipAir calendar API
    data.calendar.forEach((item: any) => {
      if (item.date && item.fare && item.fare > 0) {
        offers.push({
          date: item.date,
          price: item.fare.toString(),
          currency: item.currency || 'JPY',
          isAvailable: true
        });
      }
    });
  } else if (data && Array.isArray(data)) {
    // Some other possible structure
    data.forEach((item: any) => {
      if (item.date && item.amount) {
        offers.push({
          date: item.date,
          price: item.amount.toString(),
          currency: item.currency || 'JPY',
          isAvailable: true
        });
      }
    });
  }
  
  // Generic deep search for dates and prices if structure is unknown
  // ZipAir often uses "YYYY-MM-DD" for dates
  if (offers.length === 0 && typeof data === 'object') {
     findOffersRecursively(data, offers);
  }
}

function findOffersRecursively(obj: any, offers: FlightOffer[]) {
  if (!obj || typeof obj !== 'object') return;

  if (obj.date && (obj.fare || obj.amount || obj.price)) {
    const date = obj.date;
    const price = obj.fare || obj.amount || obj.price;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      offers.push({
        date,
        price: price.toString(),
        currency: obj.currency || 'JPY',
        isAvailable: true
      });
    }
  }

  for (const key in obj) {
    findOffersRecursively(obj[key], offers);
  }
}
