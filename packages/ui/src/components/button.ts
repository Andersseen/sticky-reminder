import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('sr-button')
export class SrButton extends LitElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    type: { type: String },
  };

  disabled = false;
  type: 'button' | 'submit' = 'button';

  static styles = css`
    :host {
      display: inline-block;
    }
    button {
      background: var(--sr-primary, #4f46e5);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      font: inherit;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    button:hover {
      opacity: 0.9;
    }
    button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <button type=${this.type} ?disabled=${this.disabled} @click=${this.#handleClick}>
        <slot></slot>
      </button>
    `;
  }

  #handleClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.dispatchEvent(
      new CustomEvent('sr-click', { bubbles: true, composed: true, detail: { original: event } }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-button': SrButton;
  }
}
