export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  service: string;
  budget?: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}
