import { cleanup, render } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function customRender(ui: React.ReactElement, options = {}) {
  return render(ui, {
    // wrap provider(s) here if needed
    wrapper: ({ children }) => children,
    ...options,
  });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
// override render export
export { customRender as render };

export const sleep = async (timeout = 0) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};
