import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHoverDelay } from './useHoverDelay';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useHoverDelay', () => {
  it('stays shut until the pointer has rested', () => {
    // The whole point: in a scrolling list the wheel brings a row to a
    // stationary cursor, and an undelayed card opens over what is being read
    const { result } = renderHook(() => useHoverDelay(500));

    act(() => result.current.triggerProps.onMouseEnter());
    expect(result.current.open).toBe(false);

    act(() => void vi.advanceTimersByTime(499));
    expect(result.current.open).toBe(false);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.open).toBe(true);
  });

  it('cancels when the pointer leaves before the delay is up', () => {
    const { result } = renderHook(() => useHoverDelay(500));

    act(() => result.current.triggerProps.onMouseEnter());
    act(() => void vi.advanceTimersByTime(300));
    act(() => result.current.triggerProps.onMouseLeave());
    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.open).toBe(false);
  });

  it('holds briefly on leaving, so the pointer can reach the card', () => {
    const { result } = renderHook(() => useHoverDelay(100, 200));

    act(() => result.current.triggerProps.onMouseEnter());
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current.open).toBe(true);

    act(() => result.current.triggerProps.onMouseLeave());
    act(() => void vi.advanceTimersByTime(199));
    expect(result.current.open).toBe(true);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.open).toBe(false);
  });

  it('re-entering cancels a pending close', () => {
    const { result } = renderHook(() => useHoverDelay(100, 200));

    act(() => result.current.triggerProps.onMouseEnter());
    act(() => void vi.advanceTimersByTime(100));
    act(() => result.current.triggerProps.onMouseLeave());
    act(() => result.current.triggerProps.onMouseEnter());
    act(() => void vi.advanceTimersByTime(100));

    expect(result.current.open).toBe(true);
  });

  it('closes immediately when told to, ignoring any pending timer', () => {
    // Escape and outside clicks must not wait out a delay
    const { result } = renderHook(() => useHoverDelay(100));

    act(() => result.current.triggerProps.onMouseEnter());
    act(() => void vi.advanceTimersByTime(100));
    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);

    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.open).toBe(false);
  });

  it('drops a pending open when the trigger unmounts', () => {
    // A card left to open by a row that has scrolled away would outlive it
    const { result, unmount } = renderHook(() => useHoverDelay(500));

    act(() => result.current.triggerProps.onMouseEnter());
    unmount();
    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.open).toBe(false);
  });
});
