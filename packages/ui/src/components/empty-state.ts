import '@andersseen/web-components/components/and-icon.js';
import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * The placeholder shown where a list would be. Both slots stay in light DOM on
 * purpose: the copy is then part of the host page's text, so it is readable by
 * anything walking the document rather than only by shadow-piercing queries.
 */
@customElement('sr-empty-state')
export class SrEmptyState extends LitElement {
  static properties = {
    icon: { type: String },
  };

  /** Name of a registered icon — see `registerStickyIcons()`. */
  icon = 'bell';

  static styles = css`
    :host {
      display: block;
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem 1.25rem;
      border: var(--border-width, 1px) dashed hsl(var(--border));
      border-radius: calc(var(--radius) * 1.25);
      background: hsl(var(--muted) / 0.35);
      text-align: center;
    }
    .badge {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: hsl(var(--primary) / 0.12);
      color: hsl(var(--primary));
    }
    ::slotted([slot='title']) {
      font-size: 0.875rem;
      font-weight: 600;
      color: hsl(var(--foreground));
    }
    .description {
      font-size: 0.8125rem;
      line-height: 1.5;
      color: hsl(var(--muted-foreground));
      max-width: 28ch;
    }
  `;

  render() {
    return html`
      <div class="empty">
        <span class="badge"><and-icon name=${this.icon} size="20"></and-icon></span>
        <slot name="title"></slot>
        <p class="description"><slot></slot></p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sr-empty-state': SrEmptyState;
  }
}
