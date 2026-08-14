import '@andersseen/web-components/components/and-badge.js';
import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-icon.js';
import type { Reminder } from '@sticky-reminder/core';
import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { formatRelativeTime, isOverdue } from '../utils/relative-time';

const REPEAT_LABELS: Record<Reminder['repeat'], string> = {
  none: '',
  daily: 'Daily',
  weekly: 'Weekly',
};

const WHEN_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

type ItemState = 'done' | 'overdue' | 'pending';

/**
 * A single reminder row. Emits `sr-reminder-toggle`, `sr-reminder-edit` and
 * `sr-reminder-delete`, each carrying `{ id }`.
 *
 * Note the layout is plain CSS rather than `@andersseen/layout` attributes:
 * those are global stylesheet rules, which do not cross into a shadow root.
 */
@customElement('sr-reminder-item')
export class SrReminderItem extends LitElement {
  static properties = {
    reminder: { attribute: false },
    editable: { type: Boolean },
  };

  /** Unset until the consumer assigns it — the element renders nothing until then. */
  reminder?: Reminder;
  /** Hides the edit action where there is no form to edit into. */
  editable = true;

  static styles = css`
    :host {
      display: block;
    }
    .item {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.75rem 0.75rem 0.75rem 0.875rem;
      overflow: hidden;
      border: var(--border-width, 1px) solid hsl(var(--border));
      border-radius: calc(var(--radius) * 1.1);
      background: hsl(var(--card));
      transition:
        border-color 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.18s ease;
    }
    /* The state accent: a hairline rail rather than a full border colour, so a
       list of mixed states still reads as one column. */
    .item::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: hsl(var(--primary));
    }
    .item[data-state='overdue']::before {
      background: hsl(var(--destructive));
    }
    .item[data-state='done']::before {
      background: hsl(var(--border));
    }
    .item:hover {
      border-color: hsl(var(--ring) / 0.45);
      box-shadow: 0 1px 2px hsl(var(--foreground) / 0.06);
    }
    .item[data-state='done'] {
      background: hsl(var(--muted) / 0.4);
    }
    .item[data-state='done'] .title {
      text-decoration: line-through;
      color: hsl(var(--muted-foreground));
    }
    .body {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1875rem;
    }
    .heading {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }
    /* and-badge styles its own host with utility classes, and those come from
       the library's light-DOM stylesheet — which, like every page-level sheet,
       stops at this shadow boundary. Rebuilt here from the same tokens. */
    and-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.0625rem 0.4375rem;
      border-radius: 9999px;
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      font-size: 0.625rem;
      font-weight: 600;
      line-height: 1.5;
      white-space: nowrap;
    }
    .title {
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      overflow-wrap: anywhere;
    }
    .notes {
      font-size: 0.75rem;
      line-height: 1.45;
      color: hsl(var(--muted-foreground));
      overflow-wrap: anywhere;
    }
    .when {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      /* One line, truncating the date if it has to: wrapping would either
         orphan the separator or start a line with it. */
      flex-wrap: nowrap;
      margin-top: 0.125rem;
      font-size: 0.6875rem;
      color: hsl(var(--muted-foreground));
    }
    .relative {
      flex: 0 0 auto;
      font-weight: 600;
      white-space: nowrap;
      color: hsl(var(--foreground) / 0.75);
    }
    .absolute {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .item[data-state='overdue'] .relative {
      color: hsl(var(--destructive));
    }
    /* The separator belongs to the absolute date so that it wraps with it,
       rather than being left dangling at the end of the previous line. */
    .when.split .absolute::before {
      content: '·';
      margin-right: 0.375rem;
      opacity: 0.6;
    }
    .actions {
      display: flex;
      gap: 0.125rem;
      flex: 0 0 auto;
      opacity: 0.55;
      transition: opacity 0.18s ease;
    }
    .item:hover .actions,
    .actions:focus-within {
      opacity: 1;
    }
    .toggle {
      flex: 0 0 auto;
      margin-top: 0.0625rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .item,
      .actions {
        transition: none;
      }
    }
  `;

  render() {
    const { reminder } = this;
    if (!reminder) return nothing;

    const when = new Date(reminder.scheduledAt);
    const valid = !Number.isNaN(when.getTime());
    const repeatLabel = REPEAT_LABELS[reminder.repeat];
    const state: ItemState = reminder.completed
      ? 'done'
      : valid && isOverdue(when)
        ? 'overdue'
        : 'pending';

    return html`
      <div class="item" data-state=${state} data-completed=${String(reminder.completed)}>
        <and-button
          class="toggle"
          size="icon"
          variant=${reminder.completed ? 'default' : 'outline'}
          aria-label=${reminder.completed ? 'Mark as pending' : 'Mark as done'}
          @click=${() => this.#emit('sr-reminder-toggle')}
        >
          <and-icon name="check" size="16"></and-icon>
        </and-button>

        <div class="body">
          <div class="heading">
            <span class="title">${reminder.title}</span>
            ${
              repeatLabel
                ? html`<and-badge variant="secondary">
                  <and-icon name="refresh-cw" size="12"></and-icon>
                  ${repeatLabel}
                </and-badge>`
                : nothing
            }
          </div>
          ${reminder.body ? html`<span class="notes">${reminder.body}</span>` : nothing}
          <span class="when ${valid && state !== 'done' ? 'split' : ''}">
            ${
              valid
                ? html`
                  ${
                    state === 'done'
                      ? nothing
                      : html`<span class="relative">${formatRelativeTime(when)}</span>`
                  }
                  <span class="absolute">${when.toLocaleString(undefined, WHEN_FORMAT)}</span>
                `
                : html`<span class="absolute">No date</span>`
            }
          </span>
        </div>

        <div class="actions">
          ${
            this.editable
              ? html`<and-button
                size="icon"
                variant="ghost"
                aria-label="Edit reminder"
                @click=${() => this.#emit('sr-reminder-edit')}
              >
                <and-icon name="edit" size="16"></and-icon>
              </and-button>`
              : nothing
          }
          <and-button
            size="icon"
            variant="ghost"
            aria-label="Delete reminder"
            @click=${() => this.#emit('sr-reminder-delete')}
          >
            <and-icon name="trash" size="16"></and-icon>
          </and-button>
        </div>
      </div>
    `;
  }

  #emit(type: string) {
    if (!this.reminder) return;
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: { id: this.reminder.id },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-reminder-item': SrReminderItem;
  }
}
