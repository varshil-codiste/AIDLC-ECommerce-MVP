import { describe, it, expect } from 'vitest';
import { redactPii } from '../utils/pii-redactor';

describe('redactPii', () => {
  it('redacts email addresses', () => {
    expect(redactPii('Contact me at user@example.com please')).toBe(
      'Contact me at [REDACTED_EMAIL] please',
    );
  });

  it('redacts multiple emails', () => {
    const result = redactPii('From a@b.com to c@d.org');
    expect(result).not.toContain('a@b.com');
    expect(result).not.toContain('c@d.org');
  });

  it('does not change plain text', () => {
    expect(redactPii('Hello world')).toBe('Hello world');
  });

  it('redacts US phone numbers', () => {
    const result = redactPii('Call me at 555-123-4567');
    expect(result).not.toContain('555-123-4567');
    expect(result).toContain('[REDACTED_PHONE]');
  });

  it('preserves non-PII numbers', () => {
    const result = redactPii('Order #12345');
    expect(result).toContain('Order #12345');
  });
});
