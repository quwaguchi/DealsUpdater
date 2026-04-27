import { scrapeAllOffers } from './scraper';
import { loadPreviousState, saveCurrentState, detectNewOffers } from './state';
import { sendNotificationEmail } from './mailer';

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Starting Relocation Specials Monitoring');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Load previous state
    console.log('\n[Step 1] Loading previous state...');
    const previousState = await loadPreviousState();
    
    // Step 2: Scrape all offers
    console.log('\n[Step 2] Scraping offers from websites...');
    const currentOffers = await scrapeAllOffers();
    
    // Step 3: Detect new offers
    console.log('\n[Step 3] Detecting new offers...');
    const newOffersResult = detectNewOffers(currentOffers, previousState.offers);
    
    // Step 4: Send notification if there are new offers
    if (newOffersResult.count > 0) {
      console.log('\n[Step 4] Sending email notification...');
      await sendNotificationEmail(newOffersResult.offers);
    } else {
      console.log('\n[Step 4] No new offers to notify');
    }
    
    // Step 5: Save current state
    console.log('\n[Step 5] Saving current state...');
    await saveCurrentState(currentOffers);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Monitoring cycle completed successfully');
    console.log(`📊 Summary: ${currentOffers.length} total offers, ${newOffersResult.count} new offers`);
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Error during monitoring cycle:');
    console.error(error);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

main();
