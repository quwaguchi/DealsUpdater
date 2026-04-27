import * as fs from 'fs';
import * as path from 'path';
import { RelocationOffer, StateData, NewOffers } from './types';

const STATE_FILE_PATH = path.join(__dirname, '../data/last_check.json');

export async function loadPreviousState(): Promise<StateData> {
  try {
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.log('[State] No previous state found, starting fresh');
      return {
        lastUpdated: new Date().toISOString(),
        offers: [],
      };
    }
    
    const data = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const state: StateData = JSON.parse(data);
    console.log(`[State] Loaded previous state with ${state.offers.length} offers`);
    return state;
  } catch (error) {
    console.error('[State] Error loading previous state:', error);
    return {
      lastUpdated: new Date().toISOString(),
      offers: [],
    };
  }
}

export async function saveCurrentState(offers: RelocationOffer[]): Promise<void> {
  try {
    const stateDir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    const state: StateData = {
      lastUpdated: new Date().toISOString(),
      offers,
    };
    
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2));
    console.log(`[State] Saved current state with ${offers.length} offers to ${STATE_FILE_PATH}`);
  } catch (error) {
    console.error('[State] Error saving current state:', error);
    throw error;
  }
}

export function detectNewOffers(currentOffers: RelocationOffer[], previousOffers: RelocationOffer[]): NewOffers {
  const previousIds = new Set(previousOffers.map(offer => offer.id));
  const newOffers = currentOffers.filter(offer => !previousIds.has(offer.id));
  
  console.log(`[State] Detected ${newOffers.length} new offers (${currentOffers.length} total vs ${previousOffers.length} previous)`);
  
  if (newOffers.length > 0) {
    console.log('[State] New offers:');
    newOffers.forEach(offer => {
      console.log(`  - ${offer.departure} → ${offer.destination} (${offer.startDate}) | ${offer.source}`);
    });
  }
  
  return {
    offers: newOffers,
    count: newOffers.length,
  };
}
