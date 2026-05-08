import * as fs from 'fs';
import * as path from 'path';
import { FlightOffer, ZipAirState } from './types';

const STATE_FILE_PATH = path.join(__dirname, '../data/last_check.json');

export async function loadPreviousState(): Promise<ZipAirState> {
  try {
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.log('[State] No previous state found, starting fresh');
      return {
        lastChecked: new Date().toISOString(),
        offers: [],
      };
    }
    
    const data = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const state: ZipAirState = JSON.parse(data);
    console.log(`[State] Loaded previous state with ${state.offers.length} dates having availability`);
    return state;
  } catch (error) {
    console.error('[State] Error loading previous state:', error);
    return {
      lastChecked: new Date().toISOString(),
      offers: [],
    };
  }
}

export async function saveCurrentState(offers: FlightOffer[]): Promise<void> {
  try {
    const stateDir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    const state: ZipAirState = {
      lastChecked: new Date().toISOString(),
      offers,
    };
    
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2));
    console.log(`[State] Saved current state with ${offers.length} available dates to ${STATE_FILE_PATH}`);
  } catch (error) {
    console.error('[State] Error saving current state:', error);
    throw error;
  }
}

export function detectNewOffers(currentOffers: FlightOffer[], previousOffers: FlightOffer[]): FlightOffer[] {
  // A "new offer" is a date that wasn't available before or a price change.
  // For simplicity, let's compare dates and prices.
  const previousMap = new Map(previousOffers.map(o => [o.date, o.price]));
  
  const newOrChanged = currentOffers.filter(current => {
    const previousPrice = previousMap.get(current.date);
    return previousPrice === undefined || previousPrice !== current.price;
  });
  
  console.log(`[State] Detected ${newOrChanged.length} new or changed offers`);
  return newOrChanged;
}
