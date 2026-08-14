import '@andersseen/web-components/components/and-badge.js';
import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-icon.js';
import type { Reminder } from '@sticky-reminder/core';
import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';

const REPEAT_LABELS: Record<Reminder['repeat'], string> = {
  none: '',
  daily: 'Daily',
  weekly: 'Weekly',
};

const WHEN_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

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
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      border: var(--border-width, 1px) solid hsl(var(--border));
      border-radius: calc(var(--radius) * 0.75);
      background: hsl(var(--card));
      transition: border-color 0.15s ease;
    }
    .item:hover {
      border-color: hsl(var(--ring) / 0.4);
    }
    .item[data-completed='true'] .title {
      text-decoration: line-through;
      color: hsl(var(--muted-foreground));
    }
    .body {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .heading {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }
    and-badge::part(badge),
    and-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .title {
      font-size: 0.875rem;
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .notes,
    .when {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      gap: 0.125rem;
      flex: 0 0 auto;
    }
    .toggle {
      flex: 0 0 auto;
      margin-top: 0.125rem;
    }
  `;

  render() {
    const { reminder } = this;
    if (!reminder) return nothing;

    const when = new Date(reminder.scheduledAt);
    const repeatLabel = REPEAT_LABELS[reminder.repeat];

    return html`
      <div class="item" data-completed=${String(reminder.completed)}>
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
          <span class="when">
            ${
              Number.isNaN(when.getTime()) ? 'No date' : when.toLocaleString(undefined, WHEN_FORMAT)
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
