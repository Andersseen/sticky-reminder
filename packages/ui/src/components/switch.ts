import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('sr-switch')
export class SrSwitch extends LitElement {
  static properties = {
    checked: { type: Boolean, reflect: true },
    label: { type: String },
    name: { type: String },
  };

  checked = false;
  label = '';
  name = '';

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }
    .track {
      width: 2.5rem;
      height: 1.4rem;
      background: var(--sr-border, #d1d5db);
      border-radius: 9999px;
      position: relative;
      transition: background 0.15s ease;
    }
    .track.on {
      background: var(--sr-primary, #4f46e5);
    }
    .thumb {
      width: 1.1rem;
      height: 1.1rem;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 0.15rem;
      left: 0.15rem;
      transition: transform 0.15s ease;
    }
    .track.on .thumb {
      transform: translateX(1.1rem);
    }
    .label {
      font-size: 0.875rem;
      color: var(--sr-text, #111827);
    }
  `;

  render() {
    return html`
      <div class="track ${this.checked ? 'on' : ''}" role="switch" aria-checked=${this.checked}>
        <div class="thumb"></div>
      </div>
      <span class="label" @click=${this.#toggle}>${this.label}</span>
    `;
  }

  #toggle(event: MouseEvent) {
    event.preventDefault();
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent('sr-change', {
        bubbles: true,
        composed: true,
        detail: { name: this.name, checked: this.checked },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-switch': SrSwitch;
  }
}
