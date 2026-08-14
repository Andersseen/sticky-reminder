import { describe, expect, it } from 'vitest';
import '../src';

async function waitForShadow(el: HTMLElement): Promise<ShadowRoot> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (!el.shadowRoot) {
    throw new Error('Shadow root not available');
  }
  return el.shadowRoot;
}

describe('sr-button', () => {
  it('renders a button with a slot', async () => {
    document.body.innerHTML = '<sr-button>Click me</sr-button>';
    const button = document.querySelector('sr-button') as HTMLElement;
    const shadow = await waitForShadow(button);
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Click me');
    expect(shadow.querySelector('button')).not.toBeNull();
  });

  it('emits sr-click on click', async () => {
    document.body.innerHTML = '<sr-button>Click</sr-button>';
    const button = document.querySelector('sr-button') as HTMLElement;
    const shadow = await waitForShadow(button);
    let clicked = false;
    button.addEventListener('sr-click', () => {
      clicked = true;
    });
    shadow.querySelector('button')?.click();
    expect(clicked).toBe(true);
  });
});

describe('sr-input', () => {
  it('renders label and input', async () => {
    document.body.innerHTML = '<sr-input name="title" label="Title"></sr-input>';
    const input = document.querySelector('sr-input') as HTMLElement;
    const shadow = await waitForShadow(input);
    expect(shadow.querySelector('label')?.textContent).toBe('Title');
    expect(shadow.querySelector('input')?.getAttribute('name')).toBe('title');
  });

  it('emits sr-change on input', async () => {
    document.body.innerHTML = '<sr-input name="title"></sr-input>';
    const input = document.querySelector('sr-input') as HTMLElement;
    const shadow = await waitForShadow(input);
    let detail: unknown;
    input.addEventListener('sr-change', (event) => {
      detail = (event as CustomEvent).detail;
    });
    const native = shadow.querySelector('input') as HTMLInputElement;
    native.value = 'Hello';
    native.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(detail).toEqual({ name: 'title', value: 'Hello' });
  });
});

describe('sr-reminder-form', () => {
  it('emits sr-submit with form data', async () => {
    document.body.innerHTML = '<sr-reminder-form></sr-reminder-form>';
    const form = document.querySelector('sr-reminder-form') as HTMLElement;
    const formShadow = await waitForShadow(form);
    let detail: unknown;
    form.addEventListener('sr-submit', (event) => {
      detail = (event as CustomEvent).detail;
    });
    const titleInput = formShadow.querySelector('sr-input[name="title"]') as HTMLElement;
    const titleShadow = await waitForShadow(titleInput);
    const native = titleShadow.querySelector('input') as HTMLInputElement;
    native.value = 'Test';
    native.dispatchEvent(new InputEvent('input', { bubbles: true }));
    (formShadow.querySelector('form') as HTMLFormElement)?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    expect((detail as { title: string }).title).toBe('Test');
  });
});
