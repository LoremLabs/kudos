import focusableSelectors from 'focusable-selectors';

export function focusTrap(node: HTMLElement) {
  const root = node.closest('body');
  if (!root) {
    throw new Error('Unexpected: root node (body) not available.');
  }

  trapFocus(node);
  root.addEventListener('keydown', keydownHandler);
  return {
    destroy() {
      root.removeEventListener('keydown', keydownHandler);
    },
  };

  function keydownHandler(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    trapFocus(node, event);
  }
}

function trapFocus(node: HTMLElement, event?: KeyboardEvent) {
  if (!(document.activeElement instanceof HTMLElement)) return;

  const focusableChildren = getFocusableChildren(node);
  if (!focusableChildren.length) return; // Eh? Why did you call trap even?

  if (!event) {
    return focusableChildren[0].focus();
  }

  const focusedItemIndex = focusableChildren.indexOf(document.activeElement);
  if (event.shiftKey && focusedItemIndex === 0) {
    focusableChildren[focusableChildren.length - 1].focus();
    event.preventDefault();
  } else if (
    !event.shiftKey &&
    focusedItemIndex === focusableChildren.length - 1
  ) {
    focusableChildren[0].focus();
    event.preventDefault();
  }
}

function getFocusableChildren(node: HTMLElement) {
  return Array.from(
    node.querySelectorAll<HTMLElement>(focusableSelectors.join(', '))
  );
}
