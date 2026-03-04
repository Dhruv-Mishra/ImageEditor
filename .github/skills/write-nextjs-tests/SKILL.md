---
name: write-nextjs-tests
description: Testing patterns for Next.js applications with Vitest and React Testing Library.
---

# Next.js Testing Skill

## Frameworks

| Layer | Tool |
|---|---|
| Unit / Integration | Vitest + React Testing Library |
| E2E (optional) | Playwright |

## File Conventions

- Co-locate tests: `ComponentName.test.tsx` next to `ComponentName.tsx`.
- Or use `__tests__/` directories for larger test suites.
- Utility tests: `utilName.test.ts` next to the utility file.

## Naming

- `describe` block: component or function name.
- `it` / `test`: "should [expected behaviour] when [condition]".

## Component Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render the heading', () => {
    render(<ComponentName />);
    expect(screen.getByRole('heading')).toHaveTextContent('...');
  });

  it('should call onClick when button is pressed', () => {
    const spy = vi.fn();
    render(<ComponentName onClick={spy} />);
    fireEvent.click(screen.getByRole('button'));
    expect(spy).toHaveBeenCalledOnce();
  });
});
```

## Utility / Logic Tests

```ts
import { generateCropSuggestion } from './cropHeuristic';

describe('generateCropSuggestion', () => {
  it('should return a 3:4 crop region', () => {
    const result = generateCropSuggestion(1000, 1500);
    expect(result.aspectRatio).toBe('3:4');
    expect(result.cropRegion.width / result.cropRegion.height).toBeCloseTo(0.75);
  });
});
```

## API Route Tests

- Import the handler function and call it with a mocked `NextRequest`.
- Assert response status and JSON body.
- Mock external services (e.g., `sharp`) with `vi.mock()`.

## Mocking

- `vi.mock('module')` for module-level mocks.
- `vi.fn()` for individual function mocks.
- Reset between tests with `beforeEach(() => vi.clearAllMocks())`.

## Notes

Testing infrastructure will be configured when needed. Current priority is unit tests for `src/lib/` utilities and integration tests for key user flows.
