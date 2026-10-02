(function () {
  'use strict';

  const instances = new WeakMap();
  const stepNames = ['Lease', 'Applicant', 'Details', 'Documents', 'Review'];
  const maxFiles = 5;
  const maxFileBytes = 10 * 1024 * 1024;
  let instanceSequence = 0;

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const clean = value => String(value == null ? '' : value).trim();
  const fileSize = bytes => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  const todayISO = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  function mount(container, options) {
    if (!(container instanceof Element)) throw new Error('RRCApplication.mount requires a container element.');
    if (instances.has(container)) instances.get(container).destroy();
    const config = options || {};
    const property = { ...(config.property || {}) };
    const commercial = property.type === 'commercial';
    const prefix = `rrc-application-${++instanceSequence}`;
    let step = 0;
    let completed = false;
    let destroyed = false;
    let fileSequence = 0;
    let documentMessage = '';
    let submissionError = '';
    let errors = {};
    const files = [];
    const initialValues = {
      moveIn: '', leaseTerm: '', otherLeaseTerm: '', fullName: '', mobile: '', email: '', alternateMobile: '',
      address: '', incomeSource: '', employer: '', occupation: '', monthlyIncome: '',
      businessName: '', tradeName: '', legalType: '', businessNature: '', businessAddress: '', representativeRole: '',
      adultCount: '1', childCount: '0', pets: 'no', petDetails: '', parking: 'no', parkingCount: '',
      emergencyName: '', emergencyRelationship: '', emergencyMobile: '', notes: '',
      intendedUse: '', otherIntendedUse: '', operatingHours: '', employeeCount: '', requiredArea: '',
      power: '', water: '', commercialParking: '', signage: '', fitOut: 'no', fitOutDetails: '',
      typedName: '', accuracy: false, previewAcknowledgement: false
    };
    const values = { ...initialValues };
    const draftKey = `rrc-application-draft:${property.id || 'selected'}`;
    let draftRestored = false;
    function saveDraft() { try { sessionStorage.setItem(draftKey, JSON.stringify({ values, step })); } catch { /* Drafts are optional when browser storage is unavailable. */ } }
    function clearDraft() { try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be unavailable. */ } }
    try { const saved = JSON.parse(sessionStorage.getItem(draftKey) || 'null'); if (saved?.values && typeof saved.values === 'object') { Object.keys(initialValues).forEach(key => { if (Object.prototype.hasOwnProperty.call(saved.values, key)) values[key] = saved.values[key]; }); step = Math.max(0, Math.min(4, Number(saved.step) || 0)); draftRestored = true; } } catch { /* Ignore a malformed or unavailable local draft. */ }

    function id(key) { return `${prefix}-${key}`; }
    function errorFor(key) {
      return errors[key] ? `<span class="error app-field-error" id="${id(key)}-error">${esc(errors[key])}</span>` : '';
    }
    function field(key, label, settings) {
      const spec = settings || {};
      const helpId = spec.help ? `${id(key)}-help` : '';
      const errorId = errors[key] ? `${id(key)}-error` : '';
      const describedBy = [helpId, errorId].filter(Boolean).join(' ');
      const common = `id="${id(key)}" name="${key}" data-field="${key}" ${spec.required ? 'required' : ''} ${describedBy ? `aria-describedby="${describedBy}"` : ''} ${errors[key] ? 'aria-invalid="true"' : ''}`;
      let control;
      if (spec.options) {
        control = `<select ${common}>${spec.options.map(option => {
          const val = Array.isArray(option) ? option[0] : option;
          const title = Array.isArray(option) ? option[1] : option;
          return `<option value="${esc(val)}" ${values[key] === val ? 'selected' : ''}>${esc(title)}</option>`;
        }).join('')}</select>`;
      } else if (spec.multiline) {
        control = `<textarea ${common} rows="3" maxlength="1500" ${spec.placeholder ? `placeholder="${esc(spec.placeholder)}"` : ''}>${esc(values[key])}</textarea>`;
      } else {
        control = `<input ${common} type="${spec.type || 'text'}" value="${esc(values[key])}" ${spec.autocomplete ? `autocomplete="${spec.autocomplete}"` : 'autocomplete="off"'} ${spec.placeholder ? `placeholder="${esc(spec.placeholder)}"` : ''} ${spec.min != null ? `min="${esc(spec.min)}"` : ''} ${spec.max != null ? `max="${esc(spec.max)}"` : ''} ${spec.step ? `step="${esc(spec.step)}"` : ''} ${spec.inputmode ? `inputmode="${spec.inputmode}"` : ''} ${spec.type === 'number' || spec.type === 'date' ? '' : 'maxlength="250"'}>`;
      }
      return `<div class="field ${spec.full ? 'full' : ''}"><label for="${id(key)}">${esc(label)}${spec.required ? ' <span class="app-required" aria-hidden="true">*</span>' : ' <span class="app-optional">(optional)</span>'}</label>${control}${spec.help ? `<span class="app-field-help" id="${helpId}">${esc(spec.help)}</span>` : ''}${errorFor(key)}</div>`;
    }

    function leaseFields() {
      const terms = commercial ? [['12', '1 year'], ['24', '2 years'], ['36', '3 years'], ['60', '5 years']] : [['6', '6 months'], ['12', '1 year'], ['24', '2 years']];
      return `<div class="note app-inline-note">You are exploring <strong>${esc(property.title || 'an RRC space')}</strong> in ${esc(property.area || 'your selected area')}. Your requested dates and lease term would be reviewed by the RRC leasing team.</div>
        <div class="form-grid">${field('moveIn', commercial ? 'Preferred occupancy date' : 'Preferred move-in date', { type: 'date', required: true, min: todayISO() })}${field('leaseTerm', 'Requested lease term', { required: true, options: [['', 'Choose a lease term'], ...terms, ['other', 'Other']] })}${values.leaseTerm === 'other' ? field('otherLeaseTerm', 'Your preferred term', { required: true, full: true, placeholder: 'For example: 18 months' }) : ''}</div>`;
    }

    function applicantFields() {
      const contact = `${field('fullName', commercial ? 'Authorized representative’s full name' : 'Full name', { required: true, autocomplete: 'name' })}${commercial ? field('representativeRole', 'Position / designation', { required: true }) : ''}${field('mobile', 'Mobile number', { required: true, type: 'tel', autocomplete: 'tel', placeholder: '09XX XXX XXXX', help: 'Use a Philippine mobile number starting with 09 or +63.' })}${field('email', 'Email address', { required: true, type: 'email', autocomplete: 'email' })}${field('alternateMobile', 'Alternative mobile number', { type: 'tel', placeholder: '09XX XXX XXXX' })}`;
      if (commercial) return `<div class="form-grid">${field('businessName', 'Registered business name', { required: true, full: true })}${field('tradeName', 'Trade name, if different')}${field('legalType', 'Business structure', { required: true, options: [['', 'Choose a structure'], ['sole', 'Sole proprietorship'], ['corporation', 'Corporation'], ['partnership', 'Partnership']] })}${field('businessNature', 'Nature of business', { required: true, full: true, placeholder: 'What products or services will you offer?' })}${field('businessAddress', 'Head office / business address', { required: true, full: true, multiline: true })}</div><h3 class="app-subheading">Your contact person</h3><div class="form-grid">${contact}</div>`;
      return `<div class="form-grid">${contact}${field('address', 'Current address', { required: true, full: true, multiline: true, autocomplete: 'street-address' })}${field('incomeSource', 'Primary source of income', { required: true, options: [['', 'Choose an income source'], ['employed', 'Employment'], ['self-employed', 'Self-employment / business'], ['other', 'Other source / support']] })}${field('monthlyIncome', 'Estimated monthly income (PHP)', { type: 'number', min: 0, step: '1', help: 'Optional sample amount for this preview.' })}${values.incomeSource === 'employed' || values.incomeSource === 'self-employed' ? field('employer', values.incomeSource === 'employed' ? 'Employer / company name' : 'Business name', { required: true }) + field('occupation', values.incomeSource === 'employed' ? 'Occupation / position' : 'Nature of business', { required: true }) : ''}</div>`;
    }

    function detailFields() {
      if (commercial) return `<div class="form-grid">${field('intendedUse', 'Proposed use of the space', { required: true, options: [['', 'Choose a use'], ['Retail', 'Retail'], ['Office', 'Office'], ['Warehouse / storage', 'Warehouse / storage'], ['Food and beverage', 'Food and beverage'], ['Service center', 'Service center'], ['Other', 'Other']] })}${values.intendedUse === 'Other' ? field('otherIntendedUse', 'Describe the proposed use', { required: true }) : ''}${field('requiredArea', 'Required floor area (sqm)', { type: 'number', min: 1, step: '0.1' })}${field('operatingHours', 'Expected operating hours', { required: true, placeholder: 'For example: Monday–Saturday, 9 AM–6 PM' })}${field('employeeCount', 'Expected employees on site', { type: 'number', min: 0, step: '1' })}${field('power', 'Power requirement', { options: [['', 'Select if known'], ['Standard', 'Standard'], ['Three-phase', 'Three-phase'], ['High load', 'High load'], ['To be discussed', 'To be discussed']] })}${field('water', 'Water requirement', { options: [['', 'Select if known'], ['Minimal', 'Minimal'], ['Moderate', 'Moderate'], ['High', 'High'], ['To be discussed', 'To be discussed']] })}${field('commercialParking', 'Parking requirement', { placeholder: 'For example: 2 staff vehicles' })}${field('signage', 'Signage requirement')}${field('fitOut', 'Will fit-out work be needed?', { required: true, options: [['no', 'No'], ['yes', 'Yes'], ['discuss', 'To be discussed']] })}${values.fitOut === 'yes' ? field('fitOutDetails', 'Describe the planned fit-out', { required: true, multiline: true, full: true }) : ''}${field('notes', 'Anything else the leasing team should know?', { multiline: true, full: true })}</div>`;
      return `<div class="form-grid">${field('adultCount', 'Number of adult occupants', { required: true, type: 'number', min: 1, step: '1' })}${field('childCount', 'Number of children', { required: true, type: 'number', min: 0, step: '1', help: 'A count is enough at this stage. Do not enter children’s names.' })}${field('pets', 'Will you be bringing pets?', { required: true, options: [['no', 'No'], ['yes', 'Yes']] })}${field('parking', 'Will you need parking?', { required: true, options: [['no', 'No'], ['yes', 'Yes']] })}${values.pets === 'yes' ? field('petDetails', 'Pet type, number and size', { required: true, full: true, placeholder: 'For example: 1 small dog', help: 'Pet arrangements depend on the chosen property.' }) : ''}${values.parking === 'yes' ? field('parkingCount', 'Number of parking spaces requested', { required: true, type: 'number', min: 1, step: '1' }) : ''}</div><h3 class="app-subheading">Emergency contact</h3><p class="app-supporting">Use sample contact details only in this preview.</p><div class="form-grid">${field('emergencyName', 'Contact’s full name', { required: true })}${field('emergencyRelationship', 'Relationship to you', { required: true })}${field('emergencyMobile', 'Contact’s mobile number', { required: true, type: 'tel', placeholder: '09XX XXX XXXX' })}${field('notes', 'Anything else the leasing team should know?', { multiline: true, full: true })}</div>`;
    }

    function documentKinds() {
      if (!commercial) return [
        { key: 'identity', title: 'Valid government ID', detail: 'Identity reference in the residential form.' },
        { key: 'income', title: values.incomeSource === 'employed' ? 'Latest payslip / income evidence' : 'Income evidence', detail: values.incomeSource === 'employed' ? 'The form lists latest payslips. No fixed number is specified.' : 'Evidence appropriate to your income source would be confirmed by RRC.' },
        { key: 'supporting', title: 'Other supporting document', detail: 'Only if requested by the leasing team.' }
      ];
      return [
        { key: values.legalType === 'sole' ? 'dti' : 'sec', title: values.legalType === 'sole' ? 'DTI registration' : 'SEC registration', detail: `Suggested registration evidence for a ${values.legalType === 'sole' ? 'sole proprietorship' : values.legalType || 'business'}.` },
        { key: 'representative', title: 'Representative’s government ID', detail: 'Sample identity evidence for the authorized representative.' },
        { key: 'profile', title: 'Company profile / application letter', detail: 'These appear in the commercial form’s supporting checklist.' },
        { key: 'authority', title: 'Authority to represent the business', detail: 'If requested; the commercial form includes a board-resolution field.' }
      ];
    }

    function documentFields() {
      return `<p class="app-supporting">Explore the document step using sample files. Uploads are optional in this preview; RRC will confirm the documents needed for an actual application.</p>
        <div class="note app-inline-note">PDF, JPG or PNG · Up to 10 MB per file · Maximum 5 files total. Files are not uploaded. Only their names, sizes and categories are kept in memory while this preview is open.</div>
        <div class="app-document-status" role="status" aria-live="polite">${esc(documentMessage || `${files.length} of ${maxFiles} sample files selected.`)}</div>
        <div class="app-document-grid">${documentKinds().map(kind => `<section class="app-document-card" aria-labelledby="${id(kind.key)}-title"><h3 id="${id(kind.key)}-title">${esc(kind.title)}</h3><p>${esc(kind.detail)}</p><label class="app-file-label" for="${id(`file-${kind.key}`)}">Choose sample files</label><input type="file" id="${id(`file-${kind.key}`)}" data-document="${kind.key}" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple aria-describedby="${id('file-guidance')}" ${files.length >= maxFiles ? 'disabled' : ''}>${files.filter(file => file.kind === kind.key).length ? `<ul class="app-file-list">${files.filter(file => file.kind === kind.key).map(file => `<li><span><strong>${esc(file.name)}</strong><small>${esc(fileSize(file.size))}</small></span><button type="button" class="app-text-button" data-action="remove-file" data-file="${file.id}" aria-label="Remove ${esc(file.name)}">Remove</button></li>`).join('')}</ul>` : '<p class="app-file-empty">No sample file selected</p>'}</section>`).join('')}</div>
        <p id="${id('file-guidance')}" class="app-supporting">Do not select real IDs, payslips or confidential company records. Sample files are enough to try this step.</p>`;
    }

    function summarySection(title, targetStep, items) {
      return `<section class="app-review-section"><div class="app-review-heading"><h3>${esc(title)}</h3><button type="button" class="app-text-button" data-action="edit" data-step="${targetStep}" aria-label="Edit ${esc(title.toLowerCase())}">Edit</button></div><dl class="review-grid">${items.filter(item => item[1] !== '' && item[1] != null).map(item => `<div><dt>${esc(item[0])}</dt><dd>${esc(item[1])}</dd></div>`).join('')}</dl></section>`;
    }

    function reviewFields() {
      const term = values.leaseTerm === 'other' ? values.otherLeaseTerm : `${values.leaseTerm} months`;
      let html = summarySection('Lease preference', 0, [['Property', property.title], ['Area', property.area], [commercial ? 'Occupancy date' : 'Move-in date', values.moveIn], ['Requested term', term]]);
      html += summarySection(commercial ? 'Business & representative' : 'Applicant', 1, commercial ? [
        ['Business', values.businessName], ['Trade name', values.tradeName], ['Structure', { sole: 'Sole proprietorship', corporation: 'Corporation', partnership: 'Partnership' }[values.legalType]], ['Nature of business', values.businessNature], ['Business address', values.businessAddress], ['Representative', values.fullName], ['Position', values.representativeRole], ['Mobile', values.mobile], ['Email', values.email], ['Alternative mobile', values.alternateMobile]
      ] : [['Name', values.fullName], ['Mobile', values.mobile], ['Email', values.email], ['Alternative mobile', values.alternateMobile], ['Current address', values.address], ['Income source', { employed: 'Employment', 'self-employed': 'Self-employment / business', other: 'Other source / support' }[values.incomeSource]], ['Employer / business', values.employer], ['Occupation / business activity', values.occupation], ['Monthly income', values.monthlyIncome ? `PHP ${Number(values.monthlyIncome).toLocaleString('en-PH')}` : '']]);
      html += summarySection('Tenancy details', 2, commercial ? [
        ['Proposed use', values.intendedUse === 'Other' ? values.otherIntendedUse : values.intendedUse], ['Required floor area', values.requiredArea ? `${values.requiredArea} sqm` : ''], ['Operating hours', values.operatingHours], ['Employees on site', values.employeeCount], ['Power', values.power], ['Water', values.water], ['Parking', values.commercialParking], ['Signage', values.signage], ['Fit-out', values.fitOut === 'yes' ? values.fitOutDetails : values.fitOut === 'discuss' ? 'To be discussed' : 'No'], ['Additional notes', values.notes]
      ] : [['Adults', values.adultCount], ['Children', values.childCount], ['Pets', values.pets === 'yes' ? values.petDetails : 'No'], ['Parking', values.parking === 'yes' ? `${values.parkingCount} space(s) requested` : 'Not requested'], ['Emergency contact', values.emergencyName], ['Relationship', values.emergencyRelationship], ['Emergency mobile', values.emergencyMobile], ['Additional notes', values.notes]]);
      html += summarySection('Sample documents', 3, files.length ? files.map(file => [documentKinds().find(kind => kind.key === file.kind)?.title || 'Supporting document', `${file.name} (${fileSize(file.size)})`]) : [['Files', 'No sample files selected']]);
      html += `<section class="app-review-section"><h3>Review and consent</h3><p class="app-supporting">Your application is recorded for the RRC leasing team. Supporting files are not uploaded in this phase; RRC may request them later.</p>
        <div class="app-check-field"><input type="checkbox" id="${id('accuracy')}" data-field="accuracy" ${values.accuracy ? 'checked' : ''} ${errors.accuracy ? `aria-invalid="true" aria-describedby="${id('accuracy')}-error"` : ''}><label for="${id('accuracy')}">I confirm the information above is accurate to the best of my knowledge.</label>${errorFor('accuracy')}</div>
        <div class="app-check-field"><input type="checkbox" id="${id('previewAcknowledgement')}" data-field="previewAcknowledgement" ${values.previewAcknowledgement ? 'checked' : ''} ${errors.previewAcknowledgement ? `aria-invalid="true" aria-describedby="${id('previewAcknowledgement')}-error"` : ''}><label for="${id('previewAcknowledgement')}">I agree that RRC may use these details to review my leasing application and contact me about it.</label>${errorFor('previewAcknowledgement')}</div>
        <div class="form-grid">${field('typedName', 'Type your full name', { required: true, full: true, help: 'This is not an electronic lease signature.' })}</div></section>`;
      return html;
    }

    function sectionTitle() {
      return ['Let’s start with your space', commercial ? 'Tell us about your business' : 'Tell us a little about yourself', commercial ? 'What does your business need?' : 'Make room for your everyday life', 'Prepare your supporting documents', 'Take a moment to review'][step];
    }

    function render(focusHeading) {
      if (destroyed) return;
      const content = completed ? `<div class="app-complete"><span class="app-complete-mark" aria-hidden="true">✓</span><p class="app-eyebrow">Application received</p><h1 id="${id('title')}" tabindex="-1">Your application is with RRC.</h1><p>Your application has been recorded for the leasing team. It does not reserve the property or create a lease agreement.</p><p class="app-supporting">RRC will contact you using the details you provided. Supporting documents are not uploaded in this phase.</p><div class="app-complete-actions"><button type="button" class="btn btn-primary" data-action="back-property">Return to the property</button><button type="button" class="btn btn-secondary" data-action="restart">Start another application</button></div></div>` : `
        <p class="app-eyebrow">${commercial ? 'Commercial' : 'Residential'} application · Step ${step + 1} of 5</p>
        <h1 id="${id('title')}" tabindex="-1">${sectionTitle()}</h1>
        <p class="app-required-note">Fields marked <span aria-hidden="true">*</span><span class="app-sr-only">with an asterisk</span> are required to continue this preview.</p>
        ${Object.keys(errors).length || submissionError ? `<div class="error app-error-summary" role="alert" tabindex="-1">${esc(submissionError || 'Please check the highlighted fields before continuing.')}</div>` : ''}
        <form novalidate aria-labelledby="${id('title')}">${[leaseFields, applicantFields, detailFields, documentFields, reviewFields][step]()}<div class="app-form-actions"><button type="button" class="btn btn-secondary" data-action="previous">${step === 0 ? 'Back to property' : 'Back'}</button><span class="app-step-count">${step + 1} / 5</span><button type="submit" class="btn btn-primary">${step === 4 ? 'Submit application' : 'Continue'}${step === 4 ? '' : ' <span aria-hidden="true">→</span>'}</button></div></form>`;
      container.innerHTML = `<section class="app-shell" aria-label="Tenant application"><div class="app-preview-banner" role="note"><strong>Application intake is in development.</strong> Your request is recorded for the RRC leasing team. Supporting files are not uploaded in this phase.${draftRestored&&!completed?' Your saved draft has been restored for this browser session.':''}</div><div class="app-layout"><aside class="app-sidebar"><button type="button" class="app-back-link" data-action="back-property"><span aria-hidden="true">←</span> Property details</button><p class="app-eyebrow">Your selected space</p><h2>${esc(property.title || 'RRC property')}</h2><p class="app-property-location">${esc(property.area || '')}</p><span class="app-type-label">${commercial ? 'Commercial' : 'Residential'}</span><ol class="steps" aria-label="Application steps">${stepNames.map((name, index) => `<li class="${!completed && index === step ? 'is-current' : index < step || completed ? 'is-done' : ''}" ${!completed && index === step ? 'aria-current="step"' : ''}><span class="app-step-number" aria-hidden="true">${index < step || completed ? '✓' : index + 1}</span>${index < step && !completed ? `<button type="button" data-action="edit" data-step="${index}">${name}</button>` : `<span>${name}</span>`}</li>`).join('')}</ol><p class="app-sidebar-note">A few clear steps.<br>Review before submitting.<br>You can go back and edit.</p></aside><div class="app-content">${content}</div></div></section>`;
      if (focusHeading) container.querySelector(`#${id('title')}`)?.focus({ preventScroll: true });
    }

    const validMobile = number => /^(?:09\d{9}|\+?639\d{9})$/.test(clean(number).replace(/[\s()-]/g, ''));
    function validateStep(index) {
      const found = {};
      const required = (key, message) => { if (!clean(values[key])) found[key] = message || 'Please complete this field.'; };
      const integer = (key, minimum, optional) => {
        if (optional && !clean(values[key])) return;
        const number = Number(values[key]);
        if (!clean(values[key]) || !Number.isInteger(number) || number < minimum || number > 1000000) found[key] = `Enter a whole number of ${minimum} or more.`;
      };
      const mobile = (key, optional) => { if ((!optional || clean(values[key])) && !validMobile(values[key])) found[key] = 'Enter a valid Philippine mobile number, such as 0917 000 0000.'; };
      if (index === 0) {
        required('moveIn', 'Choose your preferred date.');
        if (values.moveIn && (!/^\d{4}-\d{2}-\d{2}$/.test(values.moveIn) || values.moveIn < todayISO())) found.moveIn = 'Choose today or a future date.';
        required('leaseTerm', 'Choose a requested lease term.');
        if (values.leaseTerm === 'other') required('otherLeaseTerm', 'Describe your preferred lease term.');
      }
      if (index === 1) {
        required('fullName', 'Enter a sample full name.');
        mobile('mobile'); mobile('alternateMobile', true);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.email))) found.email = 'Enter a valid sample email address.';
        if (commercial) ['businessName', 'legalType', 'businessNature', 'businessAddress', 'representativeRole'].forEach(key => required(key));
        else {
          required('address'); required('incomeSource', 'Choose an income source.');
          if (values.incomeSource === 'employed' || values.incomeSource === 'self-employed') { required('employer'); required('occupation'); }
          if (values.monthlyIncome && (!Number.isFinite(Number(values.monthlyIncome)) || Number(values.monthlyIncome) < 0)) found.monthlyIncome = 'Enter a positive amount, zero, or leave this blank.';
        }
      }
      if (index === 2) {
        if (commercial) {
          required('intendedUse'); required('operatingHours');
          if (values.intendedUse === 'Other') required('otherIntendedUse');
          if (values.requiredArea && (!Number.isFinite(Number(values.requiredArea)) || Number(values.requiredArea) < 1)) found.requiredArea = 'Enter a floor area of at least 1 sqm.';
          integer('employeeCount', 0, true);
          if (values.fitOut === 'yes') required('fitOutDetails', 'Describe the planned fit-out.');
        } else {
          integer('adultCount', 1); integer('childCount', 0);
          if (values.pets === 'yes') required('petDetails', 'Tell us the pet type, number and size.');
          if (values.parking === 'yes') integer('parkingCount', 1);
          required('emergencyName'); required('emergencyRelationship'); mobile('emergencyMobile');
        }
      }
      if (index === 4) {
        if (!values.accuracy) found.accuracy = 'Confirm that the details are accurate.';
        if (!values.previewAcknowledgement) found.previewAcknowledgement = 'Consent is required before submitting your application.';
        required('typedName', 'Type your full name to submit.');
      }
      return found;
    }

    function goTo(nextStep) {
      step = Math.max(0, Math.min(4, nextStep));
      errors = {};
      documentMessage = '';
      saveDraft();
      render(true);
      container.querySelector('.app-content')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    function showSubmissionModal() {
      if (typeof document === 'undefined' || !document.body || document.querySelector(`[data-application-complete="${prefix}"]`)) return;
      const dialog = document.createElement('dialog');
      dialog.className = 'app-submission-modal';
      dialog.dataset.applicationComplete = prefix;
      dialog.setAttribute('aria-labelledby', `${id('complete-modal-title')}`);
      dialog.innerHTML = `<div class="app-submission-modal__body"><span class="app-complete-mark" aria-hidden="true">✓</span><p class="app-eyebrow">Application received</p><h2 id="${id('complete-modal-title')}">Your application is with RRC.</h2><p>Thank you. The leasing team will contact you using the mobile number and email you provided. Your application does not reserve the property or create a lease agreement.</p><div class="app-complete-actions"><button type="button" class="btn btn-primary" data-complete-action="property">Return to the property</button><button type="button" class="btn btn-secondary" data-complete-action="close">Close</button></div></div>`;
      document.body.append(dialog);
      dialog.querySelector('[data-complete-action="property"]')?.addEventListener('click', () => { dialog.close(); if (typeof config.onBack === 'function') config.onBack(); });
      dialog.querySelector('[data-complete-action="close"]')?.addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      if (typeof dialog.showModal === 'function') dialog.showModal();
    }

    async function onSubmit(event) {
      if (!event.target.matches('form')) return;
      event.preventDefault();
      errors = validateStep(step);
      if (Object.keys(errors).length) {
        render(false);
        container.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      if (step < 4) return goTo(step + 1);
      // Revalidate earlier steps so editing cannot bypass conditional requirements.
      for (let index = 0; index < 4; index++) {
        const previousErrors = validateStep(index);
        if (Object.keys(previousErrors).length) {
          step = index; errors = previousErrors; render(false);
          container.querySelector('[aria-invalid="true"]')?.focus();
          return;
        }
      }
      const summary = commercial
        ? `Preferred occupancy: ${values.moveIn}; requested term: ${values.leaseTerm === 'other' ? values.otherLeaseTerm : `${values.leaseTerm} months`}; business: ${values.businessName}; proposed use: ${values.intendedUse === 'Other' ? values.otherIntendedUse : values.intendedUse}; operating hours: ${values.operatingHours}; notes: ${values.notes}`
        : `Preferred move-in: ${values.moveIn}; requested term: ${values.leaseTerm === 'other' ? values.otherLeaseTerm : `${values.leaseTerm} months`}; adults: ${values.adultCount}; children: ${values.childCount}; pets: ${values.pets === 'yes' ? values.petDetails : 'No'}; parking: ${values.parking === 'yes' ? values.parkingCount : 'No'}; notes: ${values.notes}`;
      const submitButton = event.target.querySelector?.('button[type="submit"]');
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Submitting application…'; }
      if (typeof config.submit !== 'function') {
        completed = true;
        Object.keys(values).forEach(key => { values[key] = typeof values[key] === 'boolean' ? false : ''; });
        files.length = 0;
        documentMessage = '';
        render(true);
        showSubmissionModal();
        return;
      }
      try {
        const result = await config.submit({ type: 'APPLICATION', propertyReference: property.id, contactName: values.fullName, email: values.email, phone: values.mobile, notes: summary.slice(0, 4000), details: { ...values }, consent: true });
        if (result?.ok !== true) throw new Error(result?.error || 'Your application could not be submitted.');
      } catch (error) {
        submissionError = error instanceof Error ? error.message : 'Your application could not be submitted.';
        render(false);
        container.querySelector('.app-error-summary')?.focus();
        return;
      }
      completed = true;
      clearDraft();
      Object.keys(values).forEach(key => { values[key] = typeof values[key] === 'boolean' ? false : ''; });
      files.length = 0;
      documentMessage = '';
      render(true);
      showSubmissionModal();
    }

    function onInput(event) {
      const target = event.target;
      const key = target.dataset.field;
      if (!key || !Object.prototype.hasOwnProperty.call(values, key)) return;
      values[key] = target.type === 'checkbox' ? target.checked : target.value;
      saveDraft();
      if (errors[key]) {
        delete errors[key];
        target.removeAttribute('aria-invalid');
        container.querySelector(`#${id(key)}-error`)?.remove();
        const help = container.querySelector(`#${id(key)}-help`);
        if (help) target.setAttribute('aria-describedby', help.id); else target.removeAttribute('aria-describedby');
        if (!Object.keys(errors).length) container.querySelector('.app-error-summary')?.remove();
      }
    }

    function onChange(event) {
      const target = event.target;
      if (target.dataset.document) {
        const notices = [];
        const selected = Array.from(target.files || []);
        for (const file of selected) {
          if (!/\.(pdf|jpe?g|png)$/i.test(file.name) || (file.type && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) { notices.push(`${file.name}: choose a PDF, JPG or PNG file.`); continue; }
          if (file.size > maxFileBytes) { notices.push(`${file.name}: exceeds 10 MB.`); continue; }
          if (files.length >= maxFiles) { notices.push(`Maximum ${maxFiles} sample files total. Remove a file to add another.`); break; }
          if (files.some(item => item.name === file.name && item.size === file.size && item.kind === target.dataset.document)) { notices.push(`${file.name} is already selected here.`); continue; }
          files.push({ id: ++fileSequence, kind: target.dataset.document, name: file.name, size: file.size });
        }
        // Discard the browser's File references immediately; retain metadata only.
        target.value = '';
        documentMessage = notices.length ? notices.join(' ') : `${files.length} of ${maxFiles} sample files selected. Nothing has been uploaded.`;
        render(false);
        container.querySelector('.app-document-status')?.setAttribute('tabindex', '-1');
        container.querySelector('.app-document-status')?.focus({ preventScroll: true });
        return;
      }
      onInput(event);
      const key = target.dataset.field;
      if (!['leaseTerm', 'legalType', 'incomeSource', 'pets', 'parking', 'fitOut', 'intendedUse'].includes(key)) return;
      if (key === 'leaseTerm' && values.leaseTerm !== 'other') values.otherLeaseTerm = '';
      if (key === 'legalType') {
        const validRegistration = values.legalType === 'sole' ? 'dti' : 'sec';
        for (let index = files.length - 1; index >= 0; index--) if (['dti', 'sec'].includes(files[index].kind) && files[index].kind !== validRegistration) files.splice(index, 1);
      }
      if (key === 'incomeSource') { values.employer = ''; values.occupation = ''; }
      if (key === 'pets' && values.pets !== 'yes') values.petDetails = '';
      if (key === 'parking' && values.parking !== 'yes') values.parkingCount = '';
      if (key === 'fitOut' && values.fitOut !== 'yes') values.fitOutDetails = '';
      if (key === 'intendedUse' && values.intendedUse !== 'Other') values.otherIntendedUse = '';
      errors = {};
      saveDraft();
      render(false);
      container.querySelector(`#${id(key)}`)?.focus({ preventScroll: true });
    }

    function onClick(event) {
      const button = event.target.closest('[data-action]');
      if (!button || !container.contains(button)) return;
      switch (button.dataset.action) {
        case 'back-property':
          if (typeof config.onBack === 'function') config.onBack();
          break;
        case 'previous':
          if (step === 0) { if (typeof config.onBack === 'function') config.onBack(); }
          else goTo(step - 1);
          break;
        case 'edit': goTo(Number(button.dataset.step)); break;
        case 'remove-file': {
          const index = files.findIndex(file => file.id === Number(button.dataset.file));
          if (index >= 0) files.splice(index, 1);
          documentMessage = `${files.length} of ${maxFiles} sample files selected.`;
          saveDraft();
          render(false);
          container.querySelector('input[type="file"]')?.focus();
          break;
        }
        case 'restart':
          completed = false;
          files.length = 0;
          fileSequence = 0;
          Object.assign(values, initialValues);
          clearDraft();
          draftRestored = false;
          goTo(0);
          break;
        default: break;
      }
    }

    const controller = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        container.removeEventListener('input', onInput);
        container.removeEventListener('change', onChange);
        container.removeEventListener('click', onClick);
        container.removeEventListener('submit', onSubmit);
        Object.keys(values).forEach(key => { values[key] = ''; });
        files.length = 0;
        container.replaceChildren();
        instances.delete(container);
      }
    };
    container.addEventListener('input', onInput);
    container.addEventListener('change', onChange);
    container.addEventListener('click', onClick);
    container.addEventListener('submit', onSubmit);
    instances.set(container, controller);
    render(true);
    return controller;
  }

  window.RRCApplication = Object.freeze({ mount });
}());

