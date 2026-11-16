export type UserRole = 'client' | 'mechanic' | 'administrator';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface Mechanic {
  id: number;
  user_id: number;
  specialization: string;
  user?: User;
}

export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

export type BookingStatus = 'created' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  client_id: number;
  mechanic_id: number;
  service_id: number;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  client?: User;
  mechanic?: Mechanic;
  service?: Service;
}
