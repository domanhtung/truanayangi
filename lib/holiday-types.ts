export type HolidayTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetDishCount: number | null;
  isActive: boolean;
  dishCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HolidayTripDish = {
  id: string;
  name: string;
  category: string;
  minutes: string;
  addedAt: string;
};
