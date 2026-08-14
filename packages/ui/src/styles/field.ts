import { css } from 'lit';

/**
 * Native controls that `@andersseen/web-components` has no component for
 * (textarea, `datetime-local`), matched to `and-input`'s own utility classes:
 * `h-11 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2
 * text-sm shadow-sm`.
 */
export const fieldStyles = css`
  .sr-field {
    display: flex;
    width: 100%;
    height: 2.75rem;
    padding: 0.5rem 0.75rem;
    border: var(--border-width, 1px) solid hsl(var(--input));
    border-radius: calc(var(--radius) * 0.75);
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font: inherit;
    font-size: 0.875rem;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  @media (min-width: 640px) {
    .sr-field {
      height: 2.5rem;
    }
  }

  textarea.sr-field {
    height: auto;
    min-height: 4.5rem;
    resize: vertical;
  }

  .sr-field:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-color: hsl(var(--ring));
  }

  .sr-field::placeholder {
    color: hsl(var(--muted-foreground));
  }
`;
