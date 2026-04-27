export interface RelocationOffer {
  id: string;
  departure: string;
  destination: string;
  startDate: string;
  endDate: string;
  price: string;
  vehicleInfo: string;
  url: string;
  scrapedAt: string;
  source: 'canadream' | 'fraserway';
}

export interface StateData {
  lastUpdated: string;
  offers: RelocationOffer[];
}

export interface NewOffers {
  offers: RelocationOffer[];
  count: number;
}
