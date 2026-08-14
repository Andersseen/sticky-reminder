import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SrSelectOption } from './select';

export interface ReminderFormData {
  title: string;
  body: string;
  scheduledAt: string;
  repeat: 'none' | 'daily' | 'weekly';
}

const REPEAT_OPTIONS: SrSelectOption[] = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Every day', value: 'daily' },
  { label: 'Every week', value: 'weekly' },
];

const EMPTY_FORM: ReminderFormData = {
  title: '',
  body: '',
  scheduledAt: '',
  repeat: 'none',
};

interface FormControl extends HTMLElement {
  name: string;
  value: string;
}

const CONTROL_SELECTOR = 'sr-input, sr-textarea, sr-select';

@customElement('sr-reminder-form')
export class SrReminderForm extends LitElement {
  static properties = {
    submitLabel: { type: String, attribute: 'submit-label' },
    value: { state: true },
  };

  submitLabel = 'Create reminder';
  value: ReminderFormData = { ...EMPTY_FORM };

  static styles = css`
    :host {
      display: block;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `;

  render() {
    return html`
      <form @submit=${this.#handleSubmit} @sr-change=${this.#handleChange}>
        <sr-input
          name="title"
          label="Title"
          placeholder="What should I remind you about?"
          .value=${this.value.title}
          required
        ></sr-input>
        <sr-textarea
          name="body"
          label="Notes"
          placeholder="Add details..."
          .value=${this.value.body}
        ></sr-textarea>
        <sr-input
          name="scheduledAt"
          label="When"
          type="datetime-local"
          .value=${this.value.scheduledAt}
          required
        ></sr-input>
        <sr-select
          name="repeat"
          label="Repeat"
          .value=${this.value.repeat}
          .options=${REPEAT_OPTIONS}
        ></sr-select>
        <div class="actions">
          <sr-button type="submit">${this.submitLabel}</sr-button>
        </div>
      </form>
    `;
  }

  /**
   * Clears every field. The native form.reset() cannot reach the inputs, which
   * live inside their own shadow roots, so the state has to be reset here.
   */
  reset() {
    this.value = { ...EMPTY_FORM };
  }

  /**
   * Each control tracks its own value while the user edits it, so it can drift
   * from this form's state — Lit only re-commits a binding when the bound value
   * differs from the last one it wrote, which misses changes that land in the
   * same batch. Push the state back down to keep the form authoritative.
   */
  protected updated() {
    for (const control of this.renderRoot.querySelectorAll<FormControl>(CONTROL_SELECTOR)) {
      const expected = this.value[control.name as keyof ReminderFormData];
      if (expected !== undefined && control.value !== expected) {
        control.value = expected;
      }
    }
  }

  #handleChange(event: CustomEvent<{ name: string; value: string }>) {
    const { name, value } = event.detail;
    this.value = { ...this.value, [name]: value };
  }

  #handleSubmit(event: SubmitEvent) {
    event.preventDefault();
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
