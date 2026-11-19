// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Exploding(): never {
  throw new Error('kaboom');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>Healthy view</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy view')).toBeInTheDocument();
  });

  it('catches a render error and shows the recovery shell', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Chat crashed">
        <Exploding />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Chat crashed' })).toBeInTheDocument();
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to studio chat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload application/i })).toBeInTheDocument();
  });

  it('resets the boundary and re-renders the recovered tree', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('kaboom');
      return <p>Recovered view</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByText(/component render interrupted/i)).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /return to studio chat/i }));

    expect(screen.getByText('Recovered view')).toBeInTheDocument();
    expect(screen.queryByText(/component render interrupted/i)).not.toBeInTheDocument();
  });
});
