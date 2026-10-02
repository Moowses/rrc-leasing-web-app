(() => {
  const attachImport = () => {
    const publicLink = document.querySelector('.login-brand .brand');
    if (publicLink) publicLink.setAttribute('href', '/');
    const header = document.querySelector('[data-content="content"] .cms-header');
    const table = document.querySelector('[data-content="content"] .cms-table');
    if (!header || !table || header.querySelector('[data-import-samples]') || !table.textContent?.includes('No listings yet')) return;
    const button = document.createElement('button');
    button.className = 'secondary-action';
    button.type = 'button';
    button.dataset.importSamples = 'true';
    button.textContent = 'Import current sample listings';
    button.addEventListener('click', async () => {
      if (!window.confirm('Import the six current sample listings into the CMS? You can edit or replace them afterward.')) return;
      button.disabled = true;
      const response = await fetch('/api/admin/seed-sample', { method: 'POST' });
      if (!response.ok) { button.disabled = false; window.alert('Could not import the sample listings.'); return; }
      window.location.reload();
    });
    header.append(button);
  };
  new MutationObserver(attachImport).observe(document.body, { childList: true, subtree: true });
  attachImport();
})();
