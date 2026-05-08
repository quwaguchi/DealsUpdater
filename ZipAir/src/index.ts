import { scrapeZipAir } from './scraper';
import { loadPreviousState, saveCurrentState, detectNewOffers } from './state';
import { sendNotificationEmail } from './mailer';
import { FlightOffer } from './types';

async function main() {
  console.log('[Main] ZipAir Flight Monitor started');
  console.log('[Main] Target: Tokyo (NRT) -> Vancouver (YVR), August 2026');

  try {
    // 1. Load previous state
    const previousState = await loadPreviousState();
    
    // 2. Scrape ZipAir
    const currentOffers = await scrapeZipAir();
    console.log(`[Main] Scraped ${currentOffers.length} available dates for August 2026`);

    // 3. Detect new or changed offers
    const newOffers = detectNewOffers(currentOffers, previousState.offers);

    // 4. Send notification if there are new offers
    if (newOffers.length > 0) {
      console.log(`[Main] Found ${newOffers.length} new/changed offers. Sending notification...`);
      const success = await sendNotificationEmail(newOffers);
      if (success) {
        console.log('[Main] Notification email sent successfully');
      } else {
        console.warn('[Main] Failed to send notification email');
      }
    } else {
      console.log('[Main] No new/changed offers found');
    }

    // 5. Save current state
    await saveCurrentState(currentOffers);
    
    console.log('[Main] ZipAir Flight Monitor finished successfully');
  } catch (error) {
    console.error('[Main] Critical error during execution:', error);
    process.exit(1);
  }
}

main();
