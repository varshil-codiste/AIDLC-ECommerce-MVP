import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Composer } from '../components/chat/Composer';

describe('Composer', () => {
  it('calls onSubmit with trimmed message on Send click', () => {
    const onSubmit = vi.fn();
    render(<Composer disabled={false} onSubmit={onSubmit} />);
    const textarea = screen.getByTestId('composer-textarea');
    fireEvent.change(textarea, { target: { value: '  Hello  ' } });
    fireEvent.click(screen.getByTestId('composer-send'));
    expect(onSubmit).toHaveBeenCalledWith('Hello');
  });

  it('calls onSubmit on Enter key (not Shift+Enter)', () => {
    const onSubmit = vi.fn();
    render(<Composer disabled={false} onSubmit={onSubmit} />);
    const textarea = screen.getByTestId('composer-textarea');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith('Test');
  });

  it('does NOT call onSubmit on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(<Composer disabled={false} onSubmit={onSubmit} />);
    const textarea = screen.getByTestId('composer-textarea');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Composer disabled={true} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('composer-textarea')).toBeDisabled();
    expect(screen.getByTestId('composer-send')).toBeDisabled();
  });

  it('does not submit empty message', () => {
    const onSubmit = vi.fn();
    render(<Composer disabled={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('composer-send'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears textarea after submit', () => {
    render(<Composer disabled={false} onSubmit={vi.fn()} />);
    const textarea = screen.getByTestId('composer-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hi' } });
    fireEvent.click(screen.getByTestId('composer-send'));
    expect(textarea.value).toBe('');
  });
});
