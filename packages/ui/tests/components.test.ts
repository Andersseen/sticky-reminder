import type { Reminder } from '@sticky-reminder/core';
import { beforeEach, describe, expect, it } from 'vitest';
import '../src';
import {
  type ReminderFormData,
  type SrEmptyState,
  type SrReminderForm,
  type SrReminderItem,
  registerStickyIcons,
} from '../src';

registerStickyIcons();

async function mount<T extends HTMLElement>(tag: string): Promise<T> {
  document.body.innerHTML = `<${tag}></${tag}>`;
  const element = document.querySelector(tag) as T & { updateComplete?: Promise<unknown> };
  await element.updateComplete;
  return element;
}

function shadow(element: HTMLElement): ShadowRoot {
  if (!element.shadowRoot) throw new Error(`${element.tagName} has no shadow root`);
  return element.shadowRoot;
}

/** Mimics what `and-input` / `and-select` emit when the user types or picks. */
function emitControlChange(host: ShadowRoot, selector: string, type: string, value: string) {
  const control = host.querySelector(selector);
  if (!control) throw new Error(`No control matching ${selector}`);
  control.dispatchEvent(new CustomEvent(type, { detail: value, bubbles: true, composed: true }));
}

const HOUR = 60 * 60 * 1000;

/** Relative dates, so a fixture does not quietly become overdue with time. */
function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  const now = Date.now();
  return {
    id: 'r1',
    title: 'Standup',
    body: 'Join the team meeting',
    createdAt: new Date(now - HOUR).toISOString(),
    updatedAt: new Date(now - HOUR).toISOString(),
    scheduledAt: new Date(now + 3 * HOUR).toISOString(),
    repeat: 'daily',
    completed: false,
    ...overrides,
  };
}

describe('sr-reminder-form', () => {
  let form: SrReminderForm;

  beforeEach(async () => {
    form = await mount<SrReminderForm>('sr-reminder-form');
  });

  function submit() {
    (shadow(form).querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
  }

  it('collects every field, including the repeat interval', async () => {
    let detail: ReminderFormData | undefined;
    form.addEventListener('sr-submit', (event) => {
      detail = (event as CustomEvent<ReminderFormData>).detail;
    });

    emitControlChange(shadow(form), 'and-input[name="title"]', 'andInputChange', 'Standup');
    emitControlChange(shadow(form), 'and-select[name="repeat"]', 'andSelectChange', 'weekly');
    await form.updateComplete;

    const date = shadow(form).querySelector('input[name="scheduledAt"]') as HTMLInputElement;
    date.value = '2026-08-15T09:00';
    date.dispatchEvent(new Event('input', { bubbles: true }));
    await form.updateComplete;

    submit();
    expect(detail).toEqual({
      title: 'Standup',
      body: '',
      scheduledAt: '2026-08-15T09:00',
      repeat: 'weekly',
    });
  });

  it('refuses to submit without a title or a date', async () => {
    let submitted = false;
    form.addEventListener('sr-submit', () => {
      submitted = true;
    });

    submit();
    await form.updateComplete;

    expect(submitted).toBe(false);
    expect(form.error).not.toBe('');
  });

  it('clears every field and the error on reset', async () => {
    emitControlChange(shadow(form), 'and-input[name="title"]', 'andInputChange', 'Standup');
    submit();
    await form.updateComplete;
    expect(form.error).not.toBe('');

    form.reset();
    await form.updateComplete;

    expect(form.value).toEqual({ title: '', body: '', scheduledAt: '', repeat: 'none' });
    expect(form.error).toBe('');
    expect(
      (shadow(form).querySelector('input[name="scheduledAt"]') as HTMLInputElement).value,
    ).toBe('');
  });

  it('fills the date from a shortcut', async () => {
    const preset = shadow(form).querySelector('.preset') as HTMLButtonElement;
    expect(preset.textContent?.trim()).toBe('In 1 hour');

    preset.click();
    await form.updateComplete;

    // `datetime-local` wants local wall-clock time, not an ISO instant.
    const expected = new Date(Date.now() + 60 * 60 * 1000);
    expect(form.value.scheduledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(form.value.scheduledAt).getHours()).toBe(expected.getHours());
  });

  it('emits sr-cancel only while cancelable', async () => {
    expect(shadow(form).querySelector('and-button[variant="ghost"]')).toBeNull();

    form.cancelable = true;
    await form.updateComplete;

    let cancelled = false;
    form.addEventListener('sr-cancel', () => {
      cancelled = true;
    });
    (shadow(form).querySelector('and-button[variant="ghost"]') as HTMLElement).click();
    expect(cancelled).toBe(true);
  });
});

describe('sr-reminder-item', () => {
  it('renders the reminder without parsing it as markup', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder({ title: '<img src=x onerror=alert(1)>' });
    await item.updateComplete;

    const title = shadow(item).querySelector('.title') as HTMLElement;
    expect(title.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(title.querySelector('img')).toBeNull();
  });

  it('shows a repeat badge only for repeating reminders', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder({ repeat: 'weekly' });
    await item.updateComplete;
    expect(shadow(item).querySelector('and-badge')?.textContent).toContain('Weekly');

    item.reminder = makeReminder({ repeat: 'none' });
    await item.updateComplete;
    expect(shadow(item).querySelector('and-badge')).toBeNull();
  });

  it('hides the edit action when not editable', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder();
    item.editable = false;
    await item.updateComplete;

    expect(shadow(item).querySelector('[aria-label="Edit reminder"]')).toBeNull();
    expect(shadow(item).querySelector('[aria-label="Delete reminder"]')).not.toBeNull();
  });

  it('emits the reminder id from each action', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder({ id: 'abc' });
    await item.updateComplete;

    const seen: string[] = [];
    for (const type of ['sr-reminder-toggle', 'sr-reminder-edit', 'sr-reminder-delete']) {
      item.addEventListener(type, (event) => {
        seen.push(`${type}:${(event as CustomEvent<{ id: string }>).detail.id}`);
      });
    }

    for (const label of ['Mark as done', 'Edit reminder', 'Delete reminder']) {
      (shadow(item).querySelector(`[aria-label="${label}"]`) as HTMLElement).click();
    }

    expect(seen).toEqual([
      'sr-reminder-toggle:abc',
      'sr-reminder-edit:abc',
      'sr-reminder-delete:abc',
    ]);
  });

  it('marks a pending reminder whose moment has passed as overdue', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder({ scheduledAt: new Date(Date.now() - 2 * HOUR).toISOString() });
    await item.updateComplete;

    expect(shadow(item).querySelector('.item')?.getAttribute('data-state')).toBe('overdue');
    expect(shadow(item).querySelector('.relative')?.textContent).toContain('ago');
  });

  it('drops the countdown once a reminder is done', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder({ completed: true });
    await item.updateComplete;

    expect(shadow(item).querySelector('.item')?.getAttribute('data-state')).toBe('done');
    expect(shadow(item).querySelector('.relative')).toBeNull();
    expect(shadow(item).querySelector('.absolute')).not.toBeNull();
  });

  it('says so rather than rendering an invalid date', async () => {
    const item = await mount<SrReminderItem>('sr-reminder-item');
    item.reminder = makeReminder({ scheduledAt: 'not-a-date' });
    await item.updateComplete;

    expect(shadow(item).querySelector('.absolute')?.textContent).toBe('No date');
  });
});

describe('sr-empty-state', () => {
  it('keeps its copy in light DOM so the host page can read it', async () => {
    document.body.innerHTML = `
      <sr-empty-state icon="bell">
        <span slot="title">No reminders yet</span>
        Add one above.
      </sr-empty-state>`;
    const empty = document.querySelector('sr-empty-state') as SrEmptyState;
    await empty.updateComplete;

    expect(empty.textContent).toContain('No reminders yet');
    expect(shadow(empty).querySelector('and-icon')?.getAttribute('name')).toBe('bell');
  });
});
