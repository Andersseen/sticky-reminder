import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('sr-input')
export class SrInput extends LitElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    placeholder: { type: String },
    type: { type: String },
    name: { type: String },
  };

  label = '';
  value = '';
  placeholder = '';
  type = 'text';
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
    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--sr-border, #d1d5db);
      border-radius: 0.375rem;
      font: inherit;
      box-sizing: border-box;
    }
    input:focus {
      outline: 2px solid var(--sr-primary, #4f46e5);
    }
  `;

  render() {
    return html`
      <label part="label" for="input">${this.label}</label>
      <input
        id="input"
        part="input"
        .type=${this.type}
        .name=${this.name}
        .value=${this.value}
        .placeholder=${this.placeholder}
        @input=${this.#handleInput}
      />
    `;
  }

  #handleInput(event: InputEvent) {
    const value = (event.target as HTMLInputElement).value;
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
    'sr-input': SrInput;
  }
}
