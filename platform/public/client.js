document.querySelector('#portal-main')?.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.activeElement instanceof HTMLElement && document.activeElement.blur();
});
