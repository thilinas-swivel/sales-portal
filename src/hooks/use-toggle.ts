'use client';

import { useCallback, useState } from 'react';

/**
 * A hook for managing boolean toggle state.
 *
 * @example
 * const [isOpen, toggle, setIsOpen] = useToggle(false);
 */
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((prev) => !prev), []);
  return [value, toggle, setValue];
}
