import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('sr-textarea')
export class SrTextarea extends LitElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    placeholder: { type: String },
    name: { type: String },
  };

  label = '';
  value = '';
  placeholder = '';
  name = '';

  static styles = css`
    :host {
      display: block;
      margin-bottom: 0.75rem;
    }
    label {
      display: block;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      color: var(--sr-text, #111827);
    }
    textarea {
      width: 100%;
      min-height: 5rem;
      padding: 0.5rem;
      border: 1px solid var(--sr-border, #d1d5db);
      border-radius: 0.375rem;
      font: inherit;
      box-sizing: border-box;
      resize: vertical;
    }
    textarea:focus {
      outline: 2px solid var(--sr-primary, #4f46e5);
    }
  `;

  render() {
    return html`
      <label part="label" for="textarea">${this.label}</label>
      <textarea
        id="textarea"
        part="textarea"
        .name=${this.name}
        .placeholder=${this.placeholder}
        .value=${this.value}
        @input=${this.#handleInput}
      ></textarea>
    `;
  }

  #handleInput(event: InputEvent) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value = value;
    this.dispatchEvent(
      new CustomEvent('sr-change', {
        bubbles: true,
        composed: true,
        detail: { name: this.name, value },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-textarea': SrTextarea;
  }
}
