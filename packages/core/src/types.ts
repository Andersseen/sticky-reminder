export type RepeatInterval = 'none' | 'daily' | 'weekly';

export interface Reminder {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string;
  repeat: RepeatInterval;
  completed: boolean;
  /**
   * When the alarm last fired without the user acting on it, cleared the
   * moment they do. Firing and being handled are different events: conflating
   * them is how a notification nobody was looking at became a finished task.
   */
  firedAt?: string;
  /** How many times that unacknowledged notification has been re-shown. */
  notifyAttempts?: number;
}

export type CreateReminderInput = Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'completed'>;

export type UpdateReminderInput = Partial<CreateReminderInput>;
