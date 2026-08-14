export interface Reminder {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string;
  repeat: 'none' | 'daily' | 'weekly';
  completed: boolean;
}

export type CreateReminderInput = Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'completed'>;

export type UpdateReminderInput = Partial<CreateReminderInput>;
