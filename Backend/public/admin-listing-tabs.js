(() => {
  'use strict';
  let selected = 'ALL';
  function tab(label, type, count) { return `<button type="button" role="tab" aria-selected="${selected === type}" class="${selected === type ? 'is-active' : ''}" data-listing-type="${type}">${label} <span>${count}</span></button>`; }
  function enhance() {
    const cms = document.querySelector('[data-content="content"] .cms');
    const table = cms?.querySelector('.cms-table tbody');
    if (!cms || !table || cms.querySelector('.listing-tabs')) return;
    const rows = [...table.querySelectorAll('tr')];
    const records = rows.map(row => ({ row, type: row.textContent.includes('· RESIDENTIAL') ? 'RESIDENTIAL' : row.textContent.includes('· COMMERCIAL') ? 'COMMERCIAL' : '' })).filter(item => item.type);
    if (!records.length) return;
    const tabs = document.createElement('div');
    tabs.className = 'request-tabs listing-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Listing category');
    const redraw = () => {
      tabs.innerHTML = `${tab('All listings', 'ALL', records.length)}${tab('Commercial', 'COMMERCIAL', records.filter(item => item.type === 'COMMERCIAL').length)}${tab('Residential', 'RESIDENTIAL', records.filter(item => item.type === 'RESIDENTIAL').length)}`;
      records.forEach(item => { item.row.hidden = selected !== 'ALL' && item.type !== selected; });
      tabs.querySelectorAll('[data-listing-type]').forEach(button => button.addEventListener('click', () => { selected = button.dataset.listingType; redraw(); }));
    };
    cms.querySelector('.cms-toolbar')?.before(tabs);
    redraw();
  }
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
