import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-control.js';
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

const EMPTY_FORM: ReminderFormData = {
  title: '',
  body: '',
  scheduledAt: '',
  repeat: 'none',
};

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
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
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
            rows="3"
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
          <and-button type="submit">${this.submitLabel}</and-button>
        </div>
      </form>
    `;
  }

  /** Clears every field. Nested controls read their value from this state. */
  reset() {
    this.value = { ...EMPTY_FORM };
    this.error = '';
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
