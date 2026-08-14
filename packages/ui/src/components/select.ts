import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

export interface SrSelectOption {
  label: string;
  value: string;
}

@customElement('sr-select')
export class SrSelect extends LitElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    name: { type: String },
    options: { attribute: false },
  };

  label = '';
  value = '';
  name = '';
  options: SrSelectOption[] = [];

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
    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--sr-border, #d1d5db);
      border-radius: 0.375rem;
      font: inherit;
      box-sizing: border-box;
      background: var(--sr-surface, #ffffff);
      color: inherit;
    }
    select:focus {
      outline: 2px solid var(--sr-primary, #4f46e5);
    }
  `;

  render() {
    return html`
      <label part="label" for="select">${this.label}</label>
      <select id="select" part="select" .name=${this.name} @change=${this.#handleChange}>
        ${this.options.map(
          (option) => html`
            <option value=${option.value} ?selected=${option.value === this.value}>
              ${option.label}
            </option>
          `,
        )}
      </select>
    `;
  }

  /**
   * Once the user has picked an option the native select ignores the `selected`
   * attribute, so a programmatic value change (a reset, say) has to be pushed
   * onto the element directly.
   */
  protected updated() {
    const select = this.shadowRoot?.querySelector('select');
    if (!select || select.value === this.value) return;
    if (this.options.some((option) => option.value === this.value)) {
      select.value = this.value;
    }
  }

  #handleChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
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
    'sr-select': SrSelect;
  }
}
