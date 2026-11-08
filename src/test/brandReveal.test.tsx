import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrandReveal } from '@/components/branding/BrandReveal';

describe('BrandReveal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('covers the viewport and fades into the destination after the video ends', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const { container } = render(<BrandReveal onComplete={onComplete} />);
    const video = container.querySelector('video');

    expect(video).not.toBeNull();
    expect(video).toHaveClass('h-full', 'w-full', 'object-cover');
    expect(screen.getByRole('status')).toHaveClass('fixed', 'inset-0');

    fireEvent.ended(video!);
    expect(screen.getByRole('status')).toHaveClass('opacity-0');
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(700));
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
