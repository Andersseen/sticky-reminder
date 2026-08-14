import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('sr-card')
export class SrCard extends LitElement {
  static properties = {
    heading: { type: String },
  };

  heading = '';

  static styles = css`
    :host {
      display: block;
    }
    .card {
      border: 1px solid var(--sr-border, #e5e7eb);
      border-radius: 0.75rem;
      padding: 1rem;
      background: var(--sr-surface, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  `;

  render() {
    return html`
      <div class="card" part="card">
        ${this.heading ? html`<h3 part="heading">${this.heading}</h3>` : null}
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-card': SrCard;
  }
}
