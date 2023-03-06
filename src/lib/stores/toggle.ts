import { writable } from 'svelte/store';

/**
 * Resets from {@linkcode tempValue} to the {@linkcode defaultValue} after a
 * given delay ({@linkcode durationMs}) once {@linkcode toggle} is called.
 *
 * You can also specify a new temp value in {@linkcode toggle}, which overrides
 * {@linkcode tempValue}.
 *
 * @example
 * ```ts
 * const state = timedToggle(false, true, 1000);
 * $state === false
 * $state.toggle()
 * $state === true; // for next 1000ms
 * $state === false; // after 1000ms
 * ```
 */
export function timedToggle<A, B, C = A | B>(
  defaultValue: A,
  tempValue: B,
  durationMs = 300
) {
  const { subscribe, set } = writable<A | B | C>(defaultValue);
  let timer: null | ReturnType<typeof setTimeout> = null;
  const toggle = (value?: C) => {
    set(value ?? tempValue);
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      set(defaultValue);
      timer = null;
    }, durationMs);
  };

  return {
    subscribe,
    toggle,
  };
}

/**
 * Similar to {@linkcode timedToggle}, but must be toggled manually.
 */
export function toggle<A, B, C = A | B>(defaultValue: A, tempValue: B) {
  let defaultIsActive = true;
  const { subscribe, set } = writable<A | B | C>(defaultValue);
  const toggle = (value?: C) => {
    defaultIsActive = !defaultIsActive;
    set(defaultIsActive ? defaultValue : value ?? tempValue);
  };

  return {
    subscribe,
    toggle,
  };
}
