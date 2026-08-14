import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

export interface ReminderFormData {
  title: string;
  body: string;
  scheduledAt: string;
  repeat: 'none' | 'daily' | 'weekly';
}

@customElement('sr-reminder-form')
export class SrReminderForm extends LitElement {
  static properties = {
    submitLabel: { type: String, attribute: 'submit-label' },
    value: { state: true },
  };

  submitLabel = 'Create reminder';
  value: ReminderFormData = {
    title: '',
    body: '',
    scheduledAt: '',
    repeat: 'none',
  };

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
        <div class="actions">
          <sr-button type="submit">${this.submitLabel}</sr-button>
        </div>
      </form>
    `;
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
