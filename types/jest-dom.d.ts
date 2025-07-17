/// <reference types="@testing-library/jest-dom" />

// Extend Jest matchers with @testing-library/jest-dom custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toHaveClass(className: string): R
      toHaveValue(value: string | number): R
      toHaveFocus(): R
      toHaveAttribute(attr: string, value?: string): R
      toBeVisible(): R
      toBeChecked(): R
      toHaveTextContent(text: string): R
    }
  }
}
