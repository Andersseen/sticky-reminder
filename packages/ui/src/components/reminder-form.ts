import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-control.js';
import '@andersseen/web-components/components/and-icon.js';
import '@andersseen/web-components/components/and-input.js';
import '@andersseen/web-components/components/and-select.js';
import type { SelectOption } from '@andersseen/web-components';
import type { RepeatInterval } from '@sticky-reminder/core';
import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { fieldStyles } from '../styles/field';

export interface ReminderFormData {
  title: string;
  body: string;
  scheduledAt: string;
  repeat: RepeatInterval;
}

// Typed so a wrong key is a compile error: `and-select` reads `text`, not `label`.
const REPEAT_OPTIONS: SelectOption[] = [
  { text: 'Does not repeat', value: 'none' },
  { text: 'Every day', value: 'daily' },
  { text: 'Every week', value: 'weekly' },
];

/** One-tap due dates. Most reminders are "soon", not a date somebody types out. */
const PRESETS: { label: string; resolve: (from: Date) => Date }[] = [
  {
    label: 'In 1 hour',
    resolve: (from) => new Date(from.getTime() + 60 * 60_000),
  },
  {
    label: 'This evening',
    resolve: (from) => {
      const at = new Date(from);
      at.setHours(18, 0, 0, 0);
      // Already past six: the useful "evening" is tomorrow's.
      if (at <= from) at.setDate(at.getDate() + 1);
      return at;
    },
  },
  {
    label: 'Tomorrow 9:00',
    resolve: (from) => {
      const at = new Date(from);
      at.setDate(at.getDate() + 1);
      at.setHours(9, 0, 0, 0);
      return at;
    },
  },
];

const EMPTY_FORM: ReminderFormData = {
  title: '',
  body: '',
  scheduledAt: '',
  repeat: 'none',
};

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not an ISO instant. */
function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Create/edit form for a reminder. Emits `sr-submit` with the collected
 * {@link ReminderFormData}, and `sr-cancel` when `cancelable` is set.
 *
 * `and-input` has no `datetime-local` type and there is no textarea component,
 * so those two fields are native controls wrapped in `and-control` for the
 * label and error text, styled from the same tokens as `and-input`.
 */
@customElement('sr-reminder-form')
export class SrReminderForm extends LitElement {
  static properties = {
    submitLabel: { type: String, attribute: 'submit-label' },
    cancelable: { type: Boolean },
    value: { state: true },
    error: { state: true },
  };

  submitLabel = 'Create reminder';
  cancelable = false;
  value: ReminderFormData = { ...EMPTY_FORM };
  error = '';

  static styles = [
    fieldStyles,
    css`
      :host {
        display: block;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin-bottom: 0.375rem;
      }
      /* Deliberately not and-button: these are quiet, dense shortcuts that sit
         inside a field, and the button variants all outrank the field itself. */
      .preset {
        padding: 0.25rem 0.5rem;
        border: var(--border-width, 1px) solid hsl(var(--border));
        border-radius: 9999px;
        background: hsl(var(--muted) / 0.5);
        color: hsl(var(--muted-foreground));
        font: inherit;
        font-size: 0.6875rem;
        font-weight: 500;
        line-height: 1.4;
        cursor: pointer;
        transition:
          color 0.15s ease,
          border-color 0.15s ease,
          background-color 0.15s ease;
      }
      .preset:hover {
        border-color: hsl(var(--ring) / 0.5);
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
      }
      .preset:focus-visible {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.125rem;
      }
      /* and-button renders its native button scoped rather than into a shadow
         root, so the icon/label gap is reachable from here. */
      and-button button {
        gap: 0.375rem;
      }

      @media (prefers-reduced-motion: reduce) {
        .preset {
          transition: none;
        }
      }
    `,
  ];

  render() {
    return html`
      <form @submit=${this.#handleSubmit} novalidate>
        <and-control
          label="Title"
          required
          error=${this.error !== '' && this.value.title.trim() === '' ? this.error : ''}
        >
          <and-input
            name="title"
            label="Title"
            placeholder="What should I remind you about?"
            required
            .value=${this.value.title}
            .hasError=${this.error !== '' && this.value.title.trim() === ''}
            @andInputChange=${(event: CustomEvent<string>) => this.#setField('title', event.detail)}
          ></and-input>
        </and-control>

        <and-control label="Notes" hint="Optional details for the notification">
          <textarea
            class="sr-field"
            name="body"
            rows="2"
            placeholder="Add details..."
            .value=${this.value.body}
            @input=${(event: Event) =>
              this.#setField('body', (event.target as HTMLTextAreaElement).value)}
          ></textarea>
        </and-control>

        <and-control
          label="When"
          required
          error=${this.error !== '' && this.value.scheduledAt === '' ? this.error : ''}
        >
          <div class="presets">
            ${PRESETS.map(
              (preset) => html`
                <button type="button" class="preset" @click=${() => this.#applyPreset(preset)}>
                  ${preset.label}
                </button>
              `,
            )}
          </div>
          <input
            class="sr-field"
            type="datetime-local"
            name="scheduledAt"
            required
            .value=${this.value.scheduledAt}
            @input=${(event: Event) =>
              this.#setField('scheduledAt', (event.target as HTMLInputElement).value)}
          />
        </and-control>

        <and-control label="Repeat">
          <and-select
            name="repeat"
            label="Repeat"
            .value=${this.value.repeat}
            .options=${REPEAT_OPTIONS}
            @andSelectChange=${(event: CustomEvent<string>) =>
              this.#setField('repeat', event.detail as RepeatInterval)}
          ></and-select>
        </and-control>

        <div class="actions">
          ${
            this.cancelable
              ? html`<and-button variant="ghost" type="button" @click=${this.#handleCancel}>
                Cancel
              </and-button>`
              : null
          }
          <and-button type="submit">
            <and-icon name="bell" size="14"></and-icon>
            ${this.submitLabel}
          </and-button>
        </div>
      </form>
    `;
  }

  /** Clears every field. Nested controls read their value from this state. */
  reset() {
    this.value = { ...EMPTY_FORM };
    this.error = '';
  }

  #applyPreset(preset: (typeof PRESETS)[number]) {
    this.#setField('scheduledAt', toLocalInputValue(preset.resolve(new Date())));
  }

  #setField<K extends keyof ReminderFormData>(name: K, value: ReminderFormData[K]) {
    this.value = { ...this.value, [name]: value };
  }

  #handleCancel() {
    this.dispatchEvent(new CustomEvent('sr-cancel', { bubbles: true, composed: true }));
  }

  #handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    // The controls live in nested shadow roots, so native constraint validation
    // never reaches this form — the required fields are checked by hand.
    if (this.value.title.trim() === '' || this.value.scheduledAt === '') {
      this.error = 'Give the reminder a title and a date.';
      return;
    }

    this.error = '';
    this.dispatchEvent(
      new CustomEvent('sr-submit', {
        bubbles: true,
        composed: true,
        detail: this.value,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-reminder-form': SrReminderForm;
  }
}
