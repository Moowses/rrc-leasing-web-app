(() => {
  'use strict';
  const inventory = window.RRCProperties.filter(property => property.available === true);
  const main = document.querySelector('#main');
  const nav = document.querySelector('#main-nav');
  const gallery = document.querySelector('#gallery');
  const viewing = document.querySelector('#viewing');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = value => new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value);
  const titleCase = value => value.charAt(0).toUpperCase() + value.slice(1);
  const photoSet = p => [...new Set(p.photos)].slice(0,20);
  try { localStorage.removeItem('rrc-saved'); } catch { /* Browsing works with storage disabled. */ }
  let activePhotos = [], activePhoto = 0, activeProperty = null;
  let cleanupApplication = null;
  let currentViewing = null;
  const filters = {query:'', area:'', budget:'', kind:'',sort:'recommended'};
  window.addEventListener('rrc-properties-updated', () => {
    const refreshed = window.RRCProperties.filter(property => property.available === true);
    inventory.splice(0, inventory.length, ...refreshed);
    route();
  });
  let currentType = '';

  function card(p) {
    return `<article class="property-card">
      <div class="property-visual">
      <a class="property-photo" href="#/property/${esc(p.id)}" tabindex="-1" aria-hidden="true"><img src="${esc(p.photos[0])}" alt="" loading="lazy" width="620" height="390"></a>
      <div class="card-rent">${money(p.rent)} <span>/ month</span></div></div>
      <div class="property-body"><div class="property-meta"><span class="pill">${esc(p.kind)}</span><span class="pill sample">Sample listing</span></div>
      <h3><a href="#/property/${esc(p.id)}">${esc(p.title)}</a></h3><p class="property-location">${esc(p.area)}</p>
      <div class="property-specs"><span>${p.size} m²</span>${p.type==='residential'?`<span>${p.bedrooms===0?'Studio':p.bedrooms+' bedrooms'}</span><span>${p.bathrooms} bath${p.bathrooms>1?'s':''}</span>`:`<span>${esc(p.floor)}</span>`}</div>
      <div class="card-actions"><a href="#/property/${esc(p.id)}">View details <span aria-hidden="true">↗</span></a><button class="btn btn-primary" data-viewing="${esc(p.id)}">Request a viewing</button></div>
      <a class="card-apply" href="#/apply/${esc(p.id)}">Apply online <span aria-hidden="true">→</span></a></div>
    </article>`;
  }
  function crumbs(items) {
    return `<div class="breadcrumbs"><a href="#/">Home</a>${items.map(i=>`<span aria-hidden="true">/</span>${i.href?`<a href="${i.href}">${esc(i.label)}</a>`:`<span>${esc(i.label)}</span>`}`).join('')}</div>`;
  }
  function processList() {
    return `<ol class="process-list"><li><div><h3>Find the right space</h3><p>Browse by area, compare the details and explore the photo gallery.</p></div></li><li><div><h3>Arrange a viewing</h3><p>Share your preferred date so the leasing team can confirm a visit.</p></div></li><li><div><h3>Apply online</h3><p>Complete your details and supporting documents in one guided application.</p></div></li></ol>`;
  }
  function faq() {
    return `<div class="faq-list"><details><summary>How do I apply for a property?</summary><p>Choose a property and select Apply online. The form will guide you through your lease preferences, applicant details and supporting documents. This preview lets you try the process using sample information.</p></details><details><summary>Can I view the property first?</summary><p>Yes. Each property page has a Request a viewing option. The request form shows whether online sending is available. When enabled, requests are emailed to our leasing team. A viewing is confirmed only after RRC agrees on a schedule.</p></details><details><summary>What documents will I need?</summary><p>Residential applicants may be asked for identification and proof of income. Business applicants may be asked for DTI or SEC registration, representative identification and a business profile. RRC will confirm the checklist for each application.</p></details><details><summary>Does an application reserve a property?</summary><p>An application is a request for evaluation. It does not by itself reserve a property, approve a tenancy or create a lease agreement.</p></details></div>`;
  }
  function renderHome() {
    main.innerHTML = `<section class="home-banner"><div class="wrap home-banner-content"><div class="eyebrow">Rosefood Realty Corporation</div><h1>Room for business. Space for living.</h1><p>Find your next space in the Philippines, directly with RRC.</p><div class="category-shortcuts"><a class="btn btn-primary" href="#/properties/commercial">Commercial ↗</a><a class="btn btn-secondary" href="#/properties/residential">Residential ↗</a></div></div></section><div class="wrap home-categories">
      <div class="category-grid"><a href="#/properties/commercial" class="category-card"><div class="category-image"><img src="assets/commercial-concept.png" alt="Illustrative commercial building concept" fetchpriority="high" width="900" height="420"></div><div class="category-content"><div><h2>Commercial</h2><p>Make room for your next business move.</p></div><span class="circle-arrow" aria-hidden="true">↗</span></div></a>
      <a href="#/properties/residential" class="category-card"><div class="category-image"><img src="assets/sample-residential.jpg" alt="Illustrative residential building concept" fetchpriority="high" width="900" height="420"></div><div class="category-content"><div><h2>Residential</h2><p>Find a place to feel at home.</p></div><span class="circle-arrow" aria-hidden="true">↗</span></div></a></div>
      <p class="home-note">Concept images shown for this preview. Actual RRC property listings will replace the samples.</p>
      <div class="assurance-row"><span>Deal directly with RRC</span><span>Browse properties by area</span><span>Apply online, at your own pace</span></div></div>
      <section class="section"><div class="wrap"><div class="section-heading"><div><h2>Start with your preferred area</h2><p>Explore the sample locations in our Davao preview.</p></div></div><div class="area-strip">${[...new Set(inventory.map(p=>p.area))].sort().map(area=>`<a class="area-link" href="#/properties/all?area=${encodeURIComponent(area)}"><div><h3>${area}</h3><p>${inventory.filter(p=>p.area===area).length} sample ${inventory.filter(p=>p.area===area).length===1?'space':'spaces'}</p></div><span aria-hidden="true">↗</span></a>`).join('')}</div></div></section>
      <section class="section section-tint"><div class="wrap"><div class="section-heading"><div><h2>A closer look at the possibilities</h2><p>A preview of how your available properties will be presented.</p></div><a class="text-link" href="#/properties/all">Explore all spaces ↗</a></div><div class="property-grid featured">${inventory.filter(p=>p.featured).slice(0,3).map(card).join('')}</div></div></section>
      <section class="section"><div class="wrap"><div class="process-section"><div class="process-intro"><h2>Your next space.<br>A clear path forward.</h2><p>From the first look to your application, everything starts here.</p><a class="btn btn-primary" href="#/how-to-apply">How to apply <span aria-hidden="true">↗</span></a></div>${processList()}</div></div></section>
      <section class="section careers-home"><div class="wrap"><div class="careers-callout"><div><div class="eyebrow">Careers at RRC</div><h2>Your next chapter could be with us.</h2><p>Get in touch with our recruitment team about opportunities at Rosefood Realty Corporation.</p></div><a class="btn btn-primary" href="#/careers">Explore careers <span aria-hidden="true">↗</span></a></div></div></section>
      <section class="section"><div class="wrap faq-grid"><div><h2>A few things<br>you might be asking</h2><p>Helpful answers before you start your application.</p></div>${faq()}</div></section>`;
  }
  function listingsBase(type, params) {
    currentType = type;
    filters.query='';filters.budget='';filters.kind='';filters.sort='recommended';filters.area=params.get('area') || '';
    const heading = type==='all'?'Find your space':`${titleCase(type)} spaces`;
    const areas = [...new Set(inventory.filter(p=>type==='all'||p.type===type).map(p=>p.area))].sort();
    const kinds = [...new Set(inventory.filter(p=>type==='all'||p.type===type).map(p=>p.kind))].sort();
    if(!areas.includes(filters.area)) filters.area='';
    main.innerHTML = `<header class="leasing-banner ${esc(type)}-banner"><div class="wrap banner-content">${crumbs([{label:heading}])}<h1>${heading}</h1><p>${type==='commercial'?'A place for your business to take its next step.':type==='residential'?'Find a home that fits the way you live.':'Explore commercial and residential properties by area.'}</p></div></header><div class="wrap listing-page"><div class="category-tabs"><a href="#/properties/all" ${type==='all'?'aria-current="page"':''}>All spaces</a><a href="#/properties/commercial" ${type==='commercial'?'aria-current="page"':''}>Commercial</a><a href="#/properties/residential" ${type==='residential'?'aria-current="page"':''}>Residential</a></div>
      <form id="filters"><div class="filter-panel"><div class="field"><label for="search">Search properties</label><input id="search" name="query" type="search" placeholder="Name, area or property type"></div><div class="field"><label for="area">Area</label><select id="area" name="area"><option value="">All areas</option>${areas.map(a=>`<option ${a===filters.area?'selected':''}>${esc(a)}</option>`).join('')}</select></div><div class="field"><label for="budget">Monthly budget</label><select id="budget" name="budget"><option value="">Any budget</option><option value="10000">Up to ₱10,000</option><option value="20000">Up to ₱20,000</option><option value="30000">Up to ₱30,000</option><option value="50000">Up to ₱50,000</option></select></div><div class="field"><label for="kind">Property type</label><select id="kind" name="kind"><option value="">All types</option>${kinds.map(k=>`<option>${esc(k)}</option>`).join('')}</select></div><button class="btn btn-gold search-submit" type="submit">Find a space <span aria-hidden="true">→</span></button></div><div class="filter-foot"><p>Sample listings only. Availability and rents are illustrative.</p><button class="filter-clear" type="reset">Clear filters</button></div></form>
      <div class="results-toolbar"><p id="result-count" role="status" aria-live="polite"></p><label class="sort-control">Sort within each area <select id="sort"><option value="recommended">Recommended</option><option value="low">Rent: low to high</option><option value="high">Rent: high to low</option><option value="size">Floor area: largest</option></select></label></div><div id="listing-results"></div></div>`;
    document.querySelector('#filters').addEventListener('submit',e=>{e.preventDefault();for(const control of e.target.elements){if(control.name)filters[control.name]=control.value;}renderResults();document.querySelector('.results-toolbar').scrollIntoView({behavior:'instant',block:'start'});});
    document.querySelector('#filters').addEventListener('input',e=>{if(e.target.name){filters[e.target.name]=e.target.value;renderResults();}});
    document.querySelector('#filters').addEventListener('reset',e=>{e.preventDefault();Object.assign(filters,{query:'',area:'',budget:'',kind:''});for(const control of e.target.elements){if(control.name)control.value='';}renderResults();});
    document.querySelector('#sort').addEventListener('change',e=>{filters.sort=e.target.value;renderResults();});
    renderResults();
  }
  function filteredProperties() {
    const q = filters.query.trim().toLowerCase();
    return inventory.filter(p => (currentType==='all'||p.type===currentType)&&(!filters.area||p.area===filters.area)&&(!filters.budget||p.rent<=Number(filters.budget))&&(!filters.kind||p.kind===filters.kind)&&(!q||`${p.title} ${p.area} ${p.city} ${p.kind}`.toLowerCase().includes(q))).sort((a,b)=>filters.sort==='low'?a.rent-b.rent:filters.sort==='high'?b.rent-a.rent:filters.sort==='size'?b.size-a.size:Number(b.featured)-Number(a.featured));
  }
  function renderResults() {
    const result = filteredProperties();
    document.querySelector('#result-count').innerHTML=`<strong>${result.length} ${result.length===1?'space':'spaces'}</strong> ${filters.area?'in '+esc(filters.area):'across '+new Set(result.map(p=>p.area)).size+' areas'}`;
    document.querySelector('#listing-results').innerHTML=result.length ? [...new Set(result.map(p=>p.area))].sort().map(area=>`<section class="result-area"><div class="area-title"><h2>${esc(area)}</h2><span>${result.filter(p=>p.area===area).length} sample ${result.filter(p=>p.area===area).length===1?'property':'properties'}</span></div><div class="property-grid">${result.filter(p=>p.area===area).map(card).join('')}</div></section>`).join('') : `<div class="empty-state"><h2>No spaces match those filters</h2><p>Try another area or increase your budget to see more of the sample properties.</p><button class="btn btn-primary" id="reset-empty">Clear filters</button></div>`;
    document.querySelector('#reset-empty')?.addEventListener('click',()=>document.querySelector('#filters').reset());
  }
  function renderDetail(id) {
    const p=inventory.find(x=>x.id===id);
    if(!p){notFound();return;}
    document.title=`${p.title} | RRC Leasing`;
    const photos=photoSet(p);
    main.innerHTML=`<div class="wrap"><header class="page-head">${crumbs([{label:titleCase(p.type),href:'#/properties/'+p.type},{label:p.title}])}<div class="detail-title"><div><div class="property-meta"><span class="pill">${esc(p.kind)}</span><span class="pill sample">Sample listing</span></div><h1>${esc(p.title)}</h1><p>${esc(p.area)}</p></div></div></header>
      <div class="gallery-grid gallery-${Math.min(photos.length,3)}">${photos.slice(0,3).map((photo,i)=>`<button data-gallery="${p.id}" data-index="${i}" aria-label="Open concept photo ${i+1}"><img src="${esc(photo)}" alt="Illustrative ${p.type} concept ${i+1}; not an actual property photo" width="${i?500:1000}" height="500"></button>`).join('')}</div><div class="gallery-actions"><p>Illustrative concepts, not different views of one actual property.</p><button class="btn btn-secondary" data-gallery="${p.id}" data-index="0">View ${photos.length} photos <span aria-hidden="true">↗</span></button></div>
      <div class="detail-layout"><div class="detail-main"><h2>About this space</h2><p>${esc(p.description)}</p><dl class="detail-facts"><div><dt>Floor area</dt><dd>${p.size} m²</dd></div><div><dt>${p.type==='residential'?'Bedrooms':'Floor'}</dt><dd>${p.type==='residential'?(p.bedrooms||'Studio'):esc(p.floor)}</dd></div><div><dt>Bathrooms</dt><dd>${p.bathrooms}</dd></div></dl><h2>Space highlights</h2><ul class="feature-list">${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><h2>Location</h2><p>${esc(p.area)}, ${esc(p.city)}, Philippines. The exact address and map will be added with the verified listing.</p><h2>Before you apply</h2><p>RRC will confirm availability, permitted use, rent, deposits, utilities and lease conditions for the selected unit. Your application is subject to review.</p><div class="note">This property, its rent and specifications are sample data for the website preview.</div></div>
      <aside class="lease-card" aria-label="Leasing details"><span class="pill sample">Illustrative monthly rent</span><p class="property-price">${money(p.rent)} <span>/ month</span></p><p class="small">Final rent, taxes and other charges must be confirmed by RRC.</p><a class="btn btn-primary" href="#/apply/${p.id}">Apply online <span aria-hidden="true">↗</span></a><button class="btn btn-secondary" data-viewing="${p.id}">Request a viewing</button><hr><h3>Leasing directly with RRC</h3><p class="small">Explore the space, share your requirements and start your tenant application.</p><a class="contact-email" href="mailto:leasing@rosefoodrealtycorp.com">leasing@rosefoodrealtycorp.com</a><p class="small">Property reference: ${p.id}<br>Preview only. No reservation or application is sent.</p></aside></div></div>`;
  }
  function renderHow() {
    main.innerHTML=`<div class="wrap article">${crumbs([{label:'How to apply'}])}<h1>A simple start to your next space</h1><p>Find an RRC property that suits you, explore the details and tell us how you plan to use it.</p>${processList()}<h2>One application, tailored to you</h2><p>Residential applicants can share household and occupancy needs. Commercial applicants can describe their business, intended use, fit-out and utility requirements.</p><p>The guided form covers your chosen space, applicant details, tenancy needs, supporting documents and a final review. You can move back to edit your answers before finishing.</p><h2>Prepare your supporting documents</h2><p>Use the property’s application to view the relevant checklist. Residential evidence may include identification and proof of income. Business evidence may include DTI or SEC registration and the representative’s identification.</p><h2>What happens after an application?</h2><p>In the planned live process, the RRC leasing team reviews the information, requests anything missing and discusses the next steps. An application does not guarantee approval or reserve a property.</p><div class="note">The application in this preview uses sample information only. Documents are not uploaded, and nothing is sent to RRC or Collo.</div><section class="leasing-contact" aria-label="Leasing contact"><h2>Questions about your application?</h2><p>Contact the RRC leasing team at <a class="contact-email" href="mailto:leasing@rosefoodrealtycorp.com">leasing@rosefoodrealtycorp.com</a>.</p><p>Include your property reference when asking about a space or viewing.</p></section><div class="button-row section"><a class="btn btn-primary" href="#/properties/commercial">Commercial spaces</a><a class="btn btn-secondary" href="#/properties/residential">Residential spaces</a></div>${faq()}</div>`;
  }
  function renderApply(id) {
    const p=inventory.find(x=>x.id===id);
    if(!id){main.innerHTML=`<div class="wrap article">${crumbs([{label:'Apply online'}])}<h1>First, find your space</h1><p>Choose a property so your application includes the correct space and location.</p><div class="application-pick"><a href="#/properties/commercial"><h2>Commercial</h2><p>Retail units and offices for your business.</p><span>Explore commercial spaces ↗</span></a><a href="#/properties/residential"><h2>Residential</h2><p>Apartments, townhouses and homes.</p><span>Explore residential spaces ↗</span></a></div></div>`;return;}
    if(!p){notFound();return;}
    main.innerHTML='<div id="application-root" class="wrap"></div>';
    const instance=window.RRCApplication.mount(document.querySelector('#application-root'),{property:p,onBack:()=>{location.hash='#/property/'+p.id;},submit:async payload=>{const response=await fetch('/api/leasing-requests',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});const result=await response.json().catch(()=>({}));return response.ok?result:{...result,error:result.error||'Your application could not be submitted.'};}});
    cleanupApplication=typeof instance==='function'?instance:instance?.destroy;
  }
  function renderAbout() {
    main.innerHTML=`<div class="wrap article">${crumbs([{label:'About RRC'}])}<div class="eyebrow">Rosefood Realty Corporation</div><h1>Spaces for business and everyday life</h1><p>RRC leases its own commercial and residential properties in the Philippines. This website brings the available spaces, property information and tenant application process into one place.</p><h2>Speak directly with the property team</h2><p>Find a space by area, review its details and request a viewing. Commercial and residential applications follow separate paths, so you can provide information relevant to your tenancy.</p><p>RRC is based in Indangan, Davao City.</p><div class="button-row"><a class="btn btn-primary" href="#/properties/all">Explore all spaces</a><a class="btn btn-secondary" href="#/how-to-apply">How to apply</a></div></div>`;
  }
  function renderPrivacy() {
    main.innerHTML=`<div class="wrap article">${crumbs([{label:'Privacy & your information'}])}<h1>Your information in this preview</h1><p>This local website preview is for reviewing the design and application experience. Use sample details only.</p><h2>Tenant application details</h2><p>Tenant application answers and selected file metadata stay in this page’s memory while you try the process. They are not sent to a server, RRC or Collo. Leaving the application clears its answers. Files are not uploaded or read.</p><h2>Viewing requests</h2><p>The viewing form shows whether online sending is available. When enabled, submitting sends your name, email, optional phone number, chosen property, preferred schedule and optional message to leasing@rosefoodrealtycorp.com so the leasing team can arrange your viewing. When the form is in preview mode, nothing is sent. Closing the form clears its entries; closing it after submitting cannot recall a request already accepted for delivery.</p><h2>Job applications and email contacts</h2><p>The Careers page shows whether recruitment submission is available. While it is in preview, application details and the selected resume stay in the page and are not sent. Once live sending is enabled, submitting the form sends your details and resume to recruitment@rosefoodrealtycorp.com for HR review. Recruitment applications do not go to Collo.</p><p>Email links open your own email app. You choose what to include and whether to send it. Leasing correspondence goes to leasing@rosefoodrealtycorp.com; recruitment correspondence goes to recruitment@rosefoodrealtycorp.com.</p><h2>Before the live website opens</h2><p>RRC needs to approve its privacy notice, data collection purposes, document requirements, retention period and contact for privacy requests. The live service also needs protected application storage and a verified transfer process for Collo.</p><p>This preview notice does not replace the approved privacy notice required for the live application service.</p><a class="text-link" href="#/">Back to home ↗</a></div>`;
  }
  function renderCareers() {
    document.title='Careers | Rosefood Realty Corporation';
    const instance=window.RRCCareers.mount(main);
    cleanupApplication=typeof instance==='function'?instance:instance?.destroy;
  }
  function notFound() { main.innerHTML='<div class="wrap section"><div class="empty-state"><h1>We couldn’t find that page</h1><p>Return to the available spaces to continue browsing.</p><a class="btn btn-primary" href="#/properties/all">Explore all spaces</a></div></div>'; }
  function route() {
    if(cleanupApplication){cleanupApplication();cleanupApplication=null;}
    clearViewing();
    if(gallery.open)gallery.close(); if(viewing.open)viewing.close();
    nav.classList.remove('open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');
    const [path,query='']=(location.hash.slice(1)||'/').split('?');
    const parts=path.split('/').filter(Boolean),params=new URLSearchParams(query);
    if(parts[0]==='saved'){history.replaceState(null,'','#/properties/all');route();return;}
    document.querySelectorAll('[data-nav]').forEach(a=>{a.removeAttribute('aria-current');if(a.dataset.nav===(parts[0]==='properties'?parts[1]:parts[0]))a.setAttribute('aria-current','page');});
    document.title='RRC | Commercial & Residential Leasing';
    switch(parts[0]) {
      case undefined: renderHome();break;
      case 'properties': ['all','commercial','residential'].includes(parts[1])?listingsBase(parts[1],params):notFound();break;
      case 'property': renderDetail(parts[1]);break;
      case 'how-to-apply': renderHow();break;
      case 'apply': renderApply(parts[1]);break;
      case 'about':renderAbout();break;
      case 'privacy':renderPrivacy();break;
      case 'careers':renderCareers();break;
      default:notFound();
    }
    window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true});
  }
  function openGallery(id,index=0) {
    activeProperty=inventory.find(p=>p.id===id);if(!activeProperty)return;
    activePhotos=photoSet(activeProperty);activePhoto=Math.min(Math.max(0,index),activePhotos.length-1);
    gallery.className='gallery-dialog';
    gallery.innerHTML=`<div class="dialog-top"><h2>${esc(activeProperty.title)}</h2><button class="close-dialog" data-close="gallery" aria-label="Close photo gallery">×</button></div><div class="gallery-stage"><img id="gallery-image" alt=""><button class="gallery-nav prev" data-photo-step="-1" aria-label="Previous photo">←</button><button class="gallery-nav next" data-photo-step="1" aria-label="Next photo">→</button></div><div class="gallery-caption"><span>Illustrative concepts only</span><span id="photo-count" role="status" aria-live="polite"></span></div><div class="gallery-thumbs">${activePhotos.map((photo,i)=>`<button data-photo-index="${i}" aria-label="View concept photo ${i+1}" aria-current="false"><img src="${esc(photo)}" alt="" width="88" height="60"></button>`).join('')}</div>`;
    updatePhoto();gallery.showModal();
  }
  function updatePhoto() {
    document.querySelector('#gallery-image').src=activePhotos[activePhoto];
    document.querySelector('#gallery-image').alt=`Illustrative concept ${activePhoto+1} for ${activeProperty.title}; not an actual property photograph`;
    document.querySelector('#photo-count').textContent=`${activePhoto+1} of ${activePhotos.length}`;
    gallery.querySelectorAll('[data-photo-index]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.photoIndex)===activePhoto)));
    gallery.querySelectorAll('[data-photo-step]').forEach(b=>b.disabled=activePhotos.length<2);
  }
  function shiftPhoto(direction) {activePhoto=(activePhoto+direction+activePhotos.length)%activePhotos.length;updatePhoto();}
  gallery.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();shiftPhoto(1);}if(e.key==='ArrowLeft'){e.preventDefault();shiftPhoto(-1);}});
  function clearViewing() {
    const session=currentViewing;
    currentViewing=null;
    if(session)session.destroy();
    viewing.innerHTML='';
  }
  function openViewing(id) {
    const property=inventory.find(p=>p.id===id);if(!property)return;
    clearViewing();
    if(viewing.open)viewing.close();
    const recipient='leasing@rosefoodrealtycorp.com';
    const lifetime=new AbortController();
    const statusRequest=new AbortController();
    let submissionRequest=null, statusTimer=null, submissionTimer=null;
    let destroyed=false, checking=false, enabled=true, sending=false;
    const dayParts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const dayPart=name=>dayParts.find(part=>part.type===name).value;
    const today=`${dayPart('year')}-${dayPart('month')}-${dayPart('day')}`;
    viewing.className='viewing-dialog';
    viewing.setAttribute('closedby','none');
    viewing.innerHTML=`<div class="dialog-top"><h2 id="viewing-title">Request a viewing</h2><button class="close-dialog" data-close="viewing" aria-label="Close viewing request">×</button></div><div class="dialog-body"><h3>${esc(property.title)}</h3><p>${esc(property.area)}, ${esc(property.city)} · Reference ${esc(property.id)}</p><p>Your request is recorded for the RRC leasing team. They will contact you to confirm a schedule.</p><p class="note viewing-status" role="status">Online viewing requests are available.</p><form class="viewing-form"><div class="form-grid"><div class="field"><label for="view-name">Name *</label><input id="view-name" name="name" required maxlength="120" autocomplete="name"></div><div class="field"><label for="view-email">Email *</label><input id="view-email" name="email" type="email" required maxlength="254" autocomplete="email"></div><div class="field full"><label for="view-phone">Mobile number <span class="small">(optional)</span></label><input id="view-phone" name="phone" type="tel" maxlength="30" autocomplete="tel" placeholder="09XX XXX XXXX"></div><div class="field"><label for="view-date">Preferred date *</label><input id="view-date" name="date" type="date" min="${today}" required></div><div class="field"><label for="view-time">Preferred time * <span class="small">(Philippine time)</span></label><select id="view-time" name="time" required><option value="">Select a time</option><option>Morning</option><option>Afternoon</option><option>Flexible</option></select></div><div class="field full"><label for="view-note">Anything we should know? <span class="small">(optional)</span></label><textarea id="view-note" name="message" maxlength="1000" placeholder="Your questions or access requirements"></textarea></div></div><label class="app-check-field"><input name="consent" type="checkbox" required> I agree that RRC may use these details to arrange this viewing.</label><p class="error viewing-error" role="alert" tabindex="-1" hidden></p><div class="button-row"><button class="btn btn-primary viewing-submit" type="submit">Request a viewing</button></div><p class="small viewing-help">Use the × button to close this form. A viewing request does not reserve the property or confirm an appointment.</p></form></div>`;
    const form=viewing.querySelector('form');
    const submit=form.querySelector('.viewing-submit');
    const status=viewing.querySelector('.viewing-status');
    const errorBox=form.querySelector('.viewing-error');
    const isActive=()=>!destroyed&&currentViewing===session&&viewing.open;
    const deliveryWarning=`We could not confirm delivery. Contact ${recipient} before retrying to avoid a duplicate request.`;
    const session={destroy(){
      if(destroyed)return;
      destroyed=true;
      lifetime.abort();statusRequest.abort();submissionRequest?.abort();
      clearTimeout(statusTimer);clearTimeout(submissionTimer);
      form.reset();
    }};
    currentViewing=session;
    function setAvailability(){
      if(!isActive())return;
      for(const control of form.elements)control.disabled=sending;
      submit.disabled=checking||sending;
      submit.textContent=sending?'Sending request…':'Request a viewing';
      status.textContent='Your request is recorded in the RRC leasing workspace.';
    }
    function showResult(sent,payload){
      if(!isActive())return;
      form.reset();
      viewing.querySelector('.dialog-body').innerHTML=`<div class="viewing-success"><h3 tabindex="-1">Viewing request submitted</h3><p>Your request for <strong>${esc(property.title)}</strong> has been recorded for the RRC leasing team.</p><p><strong>Your viewing is not confirmed yet.</strong> Our leasing team will contact you about your preferred schedule: ${esc(payload.date)}, ${esc(payload.time)} (Philippine time).</p><button class="btn btn-primary" data-close="viewing">Back to property</button></div>`;
      viewing.querySelector('.viewing-success h3').focus();
    }
    form.addEventListener('input',event=>{
      if(typeof event.target.setCustomValidity==='function')event.target.setCustomValidity('');
    },{signal:lifetime.signal});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!isActive()||checking||sending)return;
      const values=new FormData(form);
      const valuesText=Object.fromEntries(['name','email','phone','date','time','message'].map(name=>[name,String(values.get(name)||'').trim()]));
      const payload={...valuesText,type:'VIEWING',propertyReference:property.id,contactName:valuesText.name,notes:`Preferred viewing: ${valuesText.date}, ${valuesText.time}. ${valuesText.message}`.trim(),consent:values.get('consent')==='on'};
      const nameInput=form.elements.namedItem('name');
      nameInput.setCustomValidity(payload.name?'':'Enter your name.');
      const phoneInput=form.elements.namedItem('phone');
      phoneInput.setCustomValidity(payload.phone&&(!/^[+()\d .-]{7,30}$/.test(payload.phone)||payload.phone.replace(/\D/g,'').length<7)?'Enter a valid contact number, or leave this optional field blank.':'');
      if(!form.reportValidity())return;
      errorBox.hidden=true;errorBox.textContent='';
      sending=true;form.setAttribute('aria-busy','true');setAvailability();
      submissionRequest=new AbortController();
      submissionTimer=setTimeout(()=>submissionRequest?.abort(),45000);
      try{
        const response=await fetch('/api/leasing-requests',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',signal:submissionRequest.signal,body:JSON.stringify(payload)});
        const body=await response.json().catch(()=>({}));
        if(!isActive())return;
        if(!response.ok||body?.ok!==true){
          let message=typeof body?.error==='string'?body.error:deliveryWarning;
          if(response.status>=500&&response.status!==503&&!message.includes(recipient))message+=` ${deliveryWarning}`;
          throw new Error(message);
        }
        showResult(true,payload);
      }catch(error){
        if(!isActive())return;
        errorBox.textContent=error instanceof TypeError||error.name==='AbortError'?deliveryWarning:error.message;
        errorBox.hidden=false;errorBox.focus();
      }finally{
        clearTimeout(submissionTimer);submissionRequest=null;sending=false;
        if(isActive()){form.removeAttribute('aria-busy');setAvailability();}
      }
    },{signal:lifetime.signal});
    viewing.showModal();
    setAvailability();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.gallery)openGallery(b.dataset.gallery,Number(b.dataset.index)||0);
    if(b.dataset.viewing)openViewing(b.dataset.viewing);
    if(b.dataset.close)document.getElementById(b.dataset.close)?.close();
    if(b.dataset.photoStep)shiftPhoto(Number(b.dataset.photoStep));
    if(b.dataset.photoIndex!==undefined){activePhoto=Number(b.dataset.photoIndex);updatePhoto();}
  });
  gallery.addEventListener('click',e=>{if(e.target===gallery){const r=gallery.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)gallery.close();}});
  viewing.addEventListener('cancel',e=>e.preventDefault());
  viewing.addEventListener('click',e=>{if(e.target===viewing)e.preventDefault();});
  viewing.addEventListener('close',()=>{if(!viewing.open)clearViewing();});
  document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();main.focus({preventScroll:true});main.scrollIntoView({behavior:'auto',block:'start'});});
  document.querySelector('.menu-toggle').addEventListener('click',e=>{const open=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));});
  window.addEventListener('hashchange',route);
  route();
})();
