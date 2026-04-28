import { chromium } from 'playwright';
import { RelocationOffer } from './types';

const CANADREAM_URL = 'https://www.canadream.com/special-offers/relocation-specials/';
const FRASERWAY_URL = 'https://rent.fraserway.com/en/rv/rental-specials/relocation-specials/';

export async function scrapCanadream(): Promise<RelocationOffer[]> {
  console.log('[Scraper] Scraping canadream.com...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(CANADREAM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for content to load
    await page.waitForSelector(
        'table.table-striped tbody tr, .relocation-card, .offer-card, [data-qa="relocation-special"]',
        { timeout: 30000 }
      ).catch(
        () => console.log('要素が見つかりませんでした（募集なし）')
      );
    
    const offers = await page.evaluate(() => {
      const results: any[] = [];
      
      // Find all offer cards/sections (adjust selector based on actual website structure)
      const rows = document.querySelectorAll('table.table-striped tbody tr');
      
      if (rows.length > 0) {
        rows.forEach((row) => {
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length >= 6) {
            const departure = tds[0]?.textContent?.trim() || '';
            const destination = tds[1]?.textContent?.trim() || '';
            const startDate = tds[2]?.textContent?.trim() || '';
            const endDate = tds[3]?.textContent?.trim() || '';
            const vehicleInfo = tds[4]?.textContent?.trim() || '';
            const price = tds[5]?.textContent?.trim() || '';
            
            if (departure && destination) {
              results.push({
                departure,
                destination,
                startDate,
                endDate,
                price,
                vehicleInfo,
              });
            }
          }
        });
      } else {
        // Fallback to old structure if table is not found
        const offerElements = document.querySelectorAll('[data-qa="relocation-special"], .relocation-card, .offer-card');
        offerElements.forEach((element) => {
          const departure = element.querySelector('[data-qa="departure"], .departure, .from')?.textContent?.trim() || '';
          const destination = element.querySelector('[data-qa="destination"], .destination, .to')?.textContent?.trim() || '';
          const startDate = element.querySelector('[data-qa="start-date"], .start-date, .date')?.textContent?.trim() || '';
          const endDate = element.querySelector('[data-qa="end-date"], .end-date')?.textContent?.trim() || '';
          const price = element.querySelector('[data-qa="price"], .price, .rate')?.textContent?.trim() || '';
          const vehicleInfo = element.querySelector('[data-qa="vehicle"], .vehicle, .vehicle-type')?.textContent?.trim() || '';
          
          if (departure && destination) {
            results.push({
              departure,
              destination,
              startDate,
              endDate,
              price,
              vehicleInfo,
            });
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
  const page = await browser.newPage();
  
  try {
    await page.goto(FRASERWAY_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for content to load
    await page.waitForSelector(
        'table.table-striped tbody tr, [data-qa="relocation-special"], .relocation-card, .offer-card, .rental-special',
        { timeout: 30000 }
      ).catch(
        () => console.log('[Scraper] Fraserway: 要素が見つかりませんでした（募集なし、または構成変更の可能性）')
      );
    
    const offers = await page.evaluate(() => {
      const results: any[] = [];
      
      // Find all offer cards/sections (adjust selector based on actual website structure)
      const rows = document.querySelectorAll('table.table-striped tbody tr');
      
      if (rows.length > 0) {
        rows.forEach((row) => {
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length >= 5) {
            const route = tds[0]?.textContent?.trim() || '';
            const vehicleInfo = tds[1]?.textContent?.trim() || '';
            const datesStr = tds[3]?.textContent?.trim() || '';
            const price = tds[4]?.textContent?.trim() || '';
            
            // Parse route (e.g., "Calgary to Whitehorse")
            const routeParts = route.split(/\s+to\s+/i);
            const departure = routeParts[0] || route;
            const destination = routeParts[1] || '';
            
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
              results.push({
                departure,
                destination,
                startDate,
                endDate,
                price,
                vehicleInfo,
              });
            }
          }
        });
      } else {
        // Fallback to old structure
        const offerElements = document.querySelectorAll('[data-qa="relocation-special"], .relocation-card, .offer-card, .rental-special');
        offerElements.forEach((element) => {
          const departure = element.querySelector('[data-qa="departure"], .departure, .from, .pickup')?.textContent?.trim() || '';
          const destination = element.querySelector('[data-qa="destination"], .destination, .to, .dropoff')?.textContent?.trim() || '';
          const startDate = element.querySelector('[data-qa="start-date"], .start-date, .date, .pickup-date')?.textContent?.trim() || '';
          const endDate = element.querySelector('[data-qa="end-date"], .end-date, .return-date')?.textContent?.trim() || '';
          const price = element.querySelector('[data-qa="price"], .price, .rate, .cost')?.textContent?.trim() || '';
          const vehicleInfo = element.querySelector('[data-qa="vehicle"], .vehicle, .vehicle-type, .rv-type')?.textContent?.trim() || '';
          
          if (departure && destination) {
            results.push({
              departure,
              destination,
              startDate,
              endDate,
              price,
              vehicleInfo,
            });
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
