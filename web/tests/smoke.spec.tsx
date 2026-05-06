import { describe, it, expect } from 'vitest';
import RootLayout, { metadata } from '../app/layout';

describe('UoW-01 web smoke', () => {
  it('layout exposes a meaningful title (NFR-A11Y-08)', () => {
    expect(metadata.title).toBeTruthy();
    expect(typeof metadata.title).toBe('string');
  });

  it('layout renders an html element with a non-empty lang (NFR-A11Y-08)', () => {
    const tree = RootLayout({ children: 'placeholder' }) as React.ReactElement<{ lang?: string }>;
    expect(tree.type).toBe('html');
    expect(tree.props.lang).toBe('en-IN');
  });
});
