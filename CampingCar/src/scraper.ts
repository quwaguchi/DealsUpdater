import { chromium } from 'playwright';
import { RelocationOffer } from './types';

const CANADREAM_URL = 'https://www.canadream.com/special-offers/relocation-specials/';
const FRASERWAY_URL = 'https://rent.fraserway.com/en/rv/rental-specials/relocation-specials/';

export async function scrapCanadream(): Promise<RelocationOffer[]> {
  console.log('[Scraper] Scraping canadream.com...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    await page.goto(CANADREAM_URL, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for content to load - being more generic
    await page.waitForSelector('table, .relocation-card, .offer-card', { timeout: 30000 })
      .catch(() => console.log('[Scraper] Canadream: Selector timeout, might be no offers or different structure'));
    
    const offers = await page.evaluate(() => {
      const results: any[] = [];
      
      // Try to find the relocation table
      const tables = Array.from(document.querySelectorAll('table'));
      const relocationTable = tables.find(t => 
        t.textContent?.includes('From') && t.textContent?.includes('To') && t.textContent?.includes('Price')
      );
      
      if (relocationTable) {
        const rows = Array.from(relocationTable.querySelectorAll('tbody tr'));
        rows.forEach((row) => {
          const tds = Array.from(row.querySelectorAll('td, th'));
          if (tds.length >= 6) {
            const departure = tds[0]?.textContent?.trim() || '';
            const destination = tds[1]?.textContent?.trim() || '';
            const startDate = tds[2]?.textContent?.trim() || '';
            const endDate = tds[3]?.textContent?.trim() || '';
            const vehicleInfo = tds[4]?.textContent?.trim() || '';
            const price = tds[5]?.textContent?.trim() || '';
            const kms = tds[6]?.textContent?.trim() || '';
            const extras = tds[7]?.textContent?.trim() || '';
            
            if (departure && destination) {
              results.push({ departure, destination, startDate, endDate, vehicleInfo, price, kms, extras });
            }
          }
        });
      }
      
      // Fallback to cards if no table found or empty
      if (results.length === 0) {
        const offerElements = document.querySelectorAll('[data-qa="relocation-special"], .relocation-card, .offer-card');
        offerElements.forEach((element) => {
          const departure = element.querySelector('[data-qa="departure"], .departure, .from')?.textContent?.trim() || '';
          const destination = element.querySelector('[data-qa="destination"], .destination, .to')?.textContent?.trim() || '';
          const startDate = element.querySelector('[data-qa="start-date"], .start-date, .date')?.textContent?.trim() || '';
          const endDate = element.querySelector('[data-qa="end-date"], .end-date')?.textContent?.trim() || '';
          const price = element.querySelector('[data-qa="price"], .price, .rate')?.textContent?.trim() || '';
          const vehicleInfo = element.querySelector('[data-qa="vehicle"], .vehicle, .vehicle-type')?.textContent?.trim() || '';
          
          if (departure && destination) {
            results.push({ departure, destination, startDate, endDate, price, vehicleInfo });
          }
        });
      }
      
      return results;
    });
    
    const now = new Date().toISOString();
    const mappedOffers: RelocationOffer[] = offers.map((offer) => ({
      id: generateHash(`${offer.departure}+${offer.destination}+${offer.startDate}`),
      departure: offer.departure,
      destination: offer.destination,
      startDate: offer.startDate,
      endDate: offer.endDate,
      price: offer.price,
      vehicleInfo: offer.vehicleInfo,
      url: CANADREAM_URL,
      scrapedAt: now,
      source: 'canadream',
      kms: offer.kms,
      extras: offer.extras,
    }));
    
    console.log(`[Scraper] Found ${mappedOffers.length} offers from canadream.com`);
    return mappedOffers;
  } finally {
    await browser.close();
  }
}

export async function scrapFraserway(): Promise<RelocationOffer[]> {
  console.log('[Scraper] Scraping fraserway.com...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    await page.goto(FRASERWAY_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await page.waitForSelector('table.table-striped tbody tr, table, .rental-special', { timeout: 30000 })
      .catch(() => console.log('[Scraper] Fraserway: Selector timeout'));
    
    const offers = await page.evaluate(() => {
      const results: any[] = [];
      
      const rows = document.querySelectorAll('table.table-striped tbody tr');
      rows.forEach((row) => {
        const tds = Array.from(row.querySelectorAll('td, th'));
        if (tds.length >= 5) {
          const route = tds[0]?.textContent?.trim() || '';
          const vehicleInfo = tds[1]?.textContent?.trim() || '';
          const duration = tds[2]?.textContent?.trim() || '';
          const datesStr = tds[3]?.textContent?.trim() || '';
          const rawPrice = tds[4]?.textContent?.trim() || '';
          const kms = tds[5]?.textContent?.trim() || '';
          
          // Parse route (e.g., "Calgary to Whitehorse")
          const routeParts = route.split(/\s+to\s+/i);
          const departure = routeParts[0] || route;
          const destination = routeParts[1] || '';
          
          // Combine price and duration to match Canadream style
          const price = duration ? `${rawPrice} (${duration})` : rawPrice;
          
          // Parse dates
          let startDate = datesStr;
          let endDate = '';
          if (datesStr.includes('/')) {
            const dateParts = datesStr.split('/');
            startDate = dateParts[0].trim();
            endDate = dateParts[1].trim();
          } else if (datesStr.toLowerCase().startsWith('until')) {
            startDate = 'Now';
            endDate = datesStr.replace(/until/i, '').trim();
          }
          
          if (departure && (destination || startDate)) {
            results.push({ departure, destination, startDate, endDate, price, vehicleInfo, kms });
          }
        }
      });
      
      if (results.length === 0) {
        const offerElements = document.querySelectorAll('[data-qa="relocation-special"], .relocation-card, .offer-card, .rental-special');
        offerElements.forEach((element) => {
          const departure = element.querySelector('[data-qa="departure"], .departure, .from, .pickup')?.textContent?.trim() || '';
          const destination = element.querySelector('[data-qa="destination"], .destination, .to, .dropoff')?.textContent?.trim() || '';
          const startDate = element.querySelector('[data-qa="start-date"], .start-date, .date, .pickup-date')?.textContent?.trim() || '';
          const endDate = element.querySelector('[data-qa="end-date"], .end-date, .return-date')?.textContent?.trim() || '';
          const price = element.querySelector('[data-qa="price"], .price, .rate, .cost')?.textContent?.trim() || '';
          const vehicleInfo = element.querySelector('[data-qa="vehicle"], .vehicle, .vehicle-type, .rv-type')?.textContent?.trim() || '';
          
          if (departure && destination) {
            results.push({ departure, destination, startDate, endDate, price, vehicleInfo });
          }
        });
      }
      
      return results;
    });
    
    const now = new Date().toISOString();
    const mappedOffers: RelocationOffer[] = offers.map((offer) => ({
      id: generateHash(`${offer.departure}+${offer.destination}+${offer.startDate}`),
      departure: offer.departure,
      destination: offer.destination,
      startDate: offer.startDate,
      endDate: offer.endDate,
      price: offer.price,
      vehicleInfo: offer.vehicleInfo,
      url: FRASERWAY_URL,
      scrapedAt: now,
      source: 'fraserway',
      kms: offer.kms,
    }));
    
    console.log(`[Scraper] Found ${mappedOffers.length} offers from fraserway.com`);
    return mappedOffers;
  } finally {
    await browser.close();
  }
}

export async function scrapeAllOffers(): Promise<RelocationOffer[]> {
  try {
    const canadreamOffers = await scrapCanadream();
    const fraserwayOffers = await scrapFraserway();
    return [...canadreamOffers, ...fraserwayOffers];
  } catch (error) {
    console.error('[Scraper] Error during scraping:', error);
    throw error;
  }
}

function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
