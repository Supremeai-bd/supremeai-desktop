// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import TowerIllustration from './TowerIllustration';

describe('TowerIllustration', () => {
  it('renders a decorative, screen-reader hidden svg', () => {
    const { container } = render(<TowerIllustration />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 580 220');
    expect(svg?.getAttribute('class')).toContain('w-full');
  });

  it('applies a custom class name', () => {
    const { container } = render(<TowerIllustration className="h-40 w-40" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('h-40 w-40');
  });
});
