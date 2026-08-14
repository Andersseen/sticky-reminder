import { css } from 'lit';

/**
 * Native controls that `@andersseen/web-components` has no component for
 * (textarea, `datetime-local`), matched to `and-input`'s own utility classes:
 * `h-11 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2
 * text-sm shadow-sm`.
 */
export const fieldStyles = css`
  /* A shadow root starts from the UA defaults, so the page's box-sizing reset
     stops at the boundary: without this, the full-width padded control these
     components render ends up exactly its own padding wider than the form. */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* and-input@0.4.1 sets bg-background but no text colour, and a native input
     does not inherit one — so it falls back to the UA black and drops to about
     1.1:1 against the dark background. Reachable from here because the
     component renders scoped, not into a shadow root. */
  and-input input {
    color: hsl(var(--foreground));
  }
  and-input input::placeholder {
    color: hsl(var(--muted-foreground));
  }

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
