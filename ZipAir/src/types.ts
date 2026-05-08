export interface FlightOffer {
  date: string;
  price: string;
  currency: string;
  isAvailable: boolean;
}

export interface ZipAirState {
  lastChecked: string;
  offers: FlightOffer[];
}
