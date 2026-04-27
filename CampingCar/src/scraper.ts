import { chromium } from 'playwright';
import { RelocationOffer } from './types';

const CANADREAM_URL = 'https://www.canadream.com/special-offers/relocation-specials/';
const FRASERWAY_URL = 'https://rent.fraserway.com/en/rv/rental-specials/relocation-specials/';

export async function scrapCanadream(): Promise<RelocationOffer[]> {
  console.log('[Scraper] Scraping canadream.com...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(CANADREAM_URL, { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    const offers = await page.evaluate(() => {
      const results: any[] = [];
      
      // Find all offer cards/sections (adjust selector based on actual website structure)
      const offerElements = document.querySelectorAll('[data-qa="relocation-special"], .relocation-card, .offer-card');
      
      offerElements.forEach((element) => {
        // Extract text content - adjust selectors based on actual HTML
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
    await page.goto(FRASERWAY_URL, { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    const offers = await page.evaluate(() => {
      const results: any[] = [];
      
      // Find all offer cards/sections (adjust selector based on actual website structure)
      const offerElements = document.querySelectorAll('[data-qa="relocation-special"], .relocation-card, .offer-card, .rental-special');
      
      offerElements.forEach((element) => {
        // Extract text content - adjust selectors based on actual HTML
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
