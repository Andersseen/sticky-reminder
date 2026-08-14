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
}

export type CreateReminderInput = Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'completed'>;

export type UpdateReminderInput = Partial<CreateReminderInput>;
