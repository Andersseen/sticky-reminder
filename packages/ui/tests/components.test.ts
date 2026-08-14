import { describe, expect, it } from 'vitest';
import '../src';
import type { ReminderFormData, SrReminderForm, SrSelect } from '../src';

async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForShadow(el: HTMLElement): Promise<ShadowRoot> {
  await tick();
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

describe('sr-select', () => {
  it('emits sr-change with the picked value', async () => {
    document.body.innerHTML = '<sr-select name="repeat"></sr-select>';
    const select = document.querySelector('sr-select') as SrSelect;
    select.options = [
      { label: 'Does not repeat', value: 'none' },
      { label: 'Every day', value: 'daily' },
    ];
    const shadow = await waitForShadow(select);
    let detail: unknown;
    select.addEventListener('sr-change', (event) => {
      detail = (event as CustomEvent).detail;
    });
    const native = shadow.querySelector('select') as HTMLSelectElement;
    native.value = 'daily';
    native.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail).toEqual({ name: 'repeat', value: 'daily' });
  });
});

describe('sr-reminder-form', () => {
  it('includes the picked repeat interval in sr-submit', async () => {
    document.body.innerHTML = '<sr-reminder-form></sr-reminder-form>';
    const form = document.querySelector('sr-reminder-form') as SrReminderForm;
    const formShadow = await waitForShadow(form);
    let detail: ReminderFormData | undefined;
    form.addEventListener('sr-submit', (event) => {
      detail = (event as CustomEvent<ReminderFormData>).detail;
    });

    const repeat = formShadow.querySelector('sr-select[name="repeat"]') as SrSelect;
    const repeatShadow = await waitForShadow(repeat);
    const native = repeatShadow.querySelector('select') as HTMLSelectElement;
    native.value = 'weekly';
    native.dispatchEvent(new Event('change', { bubbles: true }));

    (formShadow.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    expect(detail?.repeat).toBe('weekly');
  });

  it('clears every field on reset', async () => {
    document.body.innerHTML = '<sr-reminder-form></sr-reminder-form>';
    const form = document.querySelector('sr-reminder-form') as SrReminderForm;
    const formShadow = await waitForShadow(form);

    const titleInput = formShadow.querySelector('sr-input[name="title"]') as HTMLElement;
    const titleShadow = await waitForShadow(titleInput);
    const nativeTitle = titleShadow.querySelector('input') as HTMLInputElement;
    nativeTitle.value = 'Test';
    nativeTitle.dispatchEvent(new InputEvent('input', { bubbles: true }));

    const repeat = formShadow.querySelector('sr-select[name="repeat"]') as SrSelect;
    const repeatShadow = await waitForShadow(repeat);
    const nativeRepeat = repeatShadow.querySelector('select') as HTMLSelectElement;
    nativeRepeat.value = 'weekly';
    nativeRepeat.dispatchEvent(new Event('change', { bubbles: true }));
    expect(form.value).toMatchObject({ title: 'Test', repeat: 'weekly' });

    form.reset();
    await tick();

    expect(form.value).toEqual({ title: '', body: '', scheduledAt: '', repeat: 'none' });
    expect(nativeTitle.value).toBe('');
    expect(nativeRepeat.value).toBe('none');
  });

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
