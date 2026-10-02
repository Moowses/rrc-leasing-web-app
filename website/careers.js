(function () {
  'use strict';

  const vacancies = window.RRCVacancies;
  if (!Array.isArray(vacancies) || vacancies.length === 0) throw new Error('RRC vacancy descriptions must load before the careers page.');
  const positions = Object.freeze(vacancies.map(vacancy => vacancy.title));
  const recipient = 'recruitment@rosefoodrealtycorp.com';
  const maxResumeBytes = 5 * 1024 * 1024;
  const instances = new WeakMap();
  let sequence = 0;
  const escapeHTML = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  function mount(container) {
    if (!(container instanceof Element)) throw new Error('RRCCareers.mount requires a container element.');
    if (instances.has(container)) instances.get(container).destroy();
    const prefix = `careers-${++sequence}`;
    const lifetime = new AbortController();
    let destroyed = false;
    let enabled = false;
    let checking = true;
    let sending = false;
    let reader = null;
    const id = name => `${prefix}-${name}`;
    const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    function field(name, label, control, extra = '') {
      return `<div class="careers-field ${extra}"><label for="${id(name)}">${label}</label>${control}<p class="careers-field-error" id="${id(name)}-error" hidden></p></div>`;
    }
    const common = name => `id="${id(name)}" name="${name}" aria-describedby="${id(name)}-error"`;

    container.innerHTML = `
      <section class="careers-banner">
        <div class="wrap careers-banner-inner">
          <div><p class="careers-eyebrow">ROSEFOOD REALTY CORPORATION</p><h1>Careers at RRC</h1><p>Explore our vacancies and send your application directly to our recruitment team.</p></div>
          <a class="careers-banner-link" href="#${id('vacancies')}">Explore ${positions.length} vacancies <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <div class="wrap careers-page">
        <div class="careers-intro"><p>Find a role that fits your experience.</p><span>${positions.length} open positions</span></div>
        <div class="careers-board">
          <section class="careers-vacancies" id="${id('vacancies')}" aria-labelledby="${id('vacancies-title')}">
            <div class="careers-section-heading"><p class="careers-eyebrow">JOIN OUR TEAM</p><h2 id="${id('vacancies-title')}">Current vacancies</h2><p>Explore each role, then select a position to start your application.</p><p class="careers-draft-note">Draft job descriptions for RRC review.</p></div>
            <ol class="careers-vacancy-list">${vacancies.map((vacancy, index) => `<li>
              <div class="careers-role-header"><span class="careers-role-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHTML(vacancy.title)}</h3><button type="button" class="careers-role-apply" data-careers-position="${escapeHTML(vacancy.title)}" aria-label="Apply for ${escapeHTML(vacancy.title)}">Apply <span aria-hidden="true">↗</span></button></div>
              <details class="careers-role-details"><summary aria-label="View qualifications and job roles for ${escapeHTML(vacancy.title)}">View qualifications and job roles</summary><div class="careers-role-description"><p>${escapeHTML(vacancy.overview)}</p><h4>Qualifications</h4><ul>${vacancy.qualifications.map(qualification => `<li>${escapeHTML(qualification)}</li>`).join('')}</ul><h4>Job roles</h4><ul>${vacancy.responsibilities.map(responsibility => `<li>${escapeHTML(responsibility)}</li>`).join('')}</ul></div></details>
            </li>`).join('')}</ol>
            <div class="careers-contact"><h3>Reach our recruitment team</h3><a href="mailto:${recipient}">${recipient}</a><p>Job applications are handled by HR. For property enquiries, contact <a href="mailto:leasing@rosefoodrealtycorp.com">leasing@rosefoodrealtycorp.com</a>.</p></div>
          </section>
          <section class="careers-application" aria-labelledby="${id('application-title')}">
            <div class="careers-section-heading"><p class="careers-eyebrow">YOUR NEXT STEP</p><h2 id="${id('application-title')}" tabindex="-1">Apply for a position</h2><p>Your application and résumé go to <strong>${recipient}</strong>.</p></div>
            <p class="careers-notice" role="status" id="${id('status')}">Checking application availability…</p>
            <form class="careers-form" novalidate>
              <p class="careers-required-note">Fields marked <span aria-hidden="true">*</span> are required.</p>
              <div class="careers-form-grid">
                ${field('position', 'Position <span aria-hidden="true">*</span>', `<select ${common('position')} required><option value="">Choose a position</option>${positions.map(position => `<option value="${escapeHTML(position)}">${escapeHTML(position)}</option>`).join('')}</select>`, 'careers-full')}
                ${field('firstName', 'First name <span aria-hidden="true">*</span>', `<input ${common('firstName')} type="text" autocomplete="given-name" maxlength="60" required>`)}
                ${field('lastName', 'Last name <span aria-hidden="true">*</span>', `<input ${common('lastName')} type="text" autocomplete="family-name" maxlength="60" required>`)}
                ${field('email', 'Email address <span aria-hidden="true">*</span>', `<input ${common('email')} type="email" autocomplete="email" maxlength="254" required>`)}
                ${field('phone', 'Mobile number <span class="careers-optional">(optional)</span>', `<input ${common('phone')} type="tel" autocomplete="tel" maxlength="30" placeholder="09XX XXX XXXX">`)}
                ${field('message', 'Message <span class="careers-optional">(optional)</span>', `<textarea ${common('message')} rows="3" maxlength="3000" placeholder="Tell us a little about your interest in this role."></textarea>`, 'careers-full')}
                ${field('resume', 'Attach your résumé <span aria-hidden="true">*</span>', `<input id="${id('resume')}" name="resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-describedby="${id('resume')}-help ${id('resume')}-error" required><p class="careers-help" id="${id('resume')}-help">One PDF or Word document, up to 5 MB.</p><p class="careers-file-state" aria-live="polite" id="${id('file-state')}"></p>`, 'careers-full')}
              </div>
              <div class="careers-consent"><label for="${id('consent')}"><input id="${id('consent')}" type="checkbox" name="consent" required aria-describedby="${id('consent')}-error"><span>I consent to RRC using my application details and résumé to review my application and contact me about recruitment. <span aria-hidden="true">*</span></span></label><p class="careers-field-error" id="${id('consent')}-error" hidden></p></div>
              <p class="careers-submit-error" id="${id('submit-error')}" role="alert" tabindex="-1" hidden></p>
              <button class="btn btn-primary careers-submit" type="submit" disabled>Checking availability…</button>
              <p class="careers-submit-help" id="${id('submit-help')}">Your résumé is only selected on this device until you submit.</p>
            </form>
            <div class="careers-result" hidden></div>
          </section>
        </div>
      </div>`;

    const form = container.querySelector('.careers-form');
    const status = container.querySelector(`#${id('status')}`);
    const submit = form.querySelector('.careers-submit');
    const submitHelp = container.querySelector(`#${id('submit-help')}`);
    const result = container.querySelector('.careers-result');
    const heading = container.querySelector(`#${id('application-title')}`);
    const controls = form.elements;
    const errorBox = container.querySelector(`#${id('submit-error')}`);

    function setError(name, message) {
      const error = container.querySelector(`#${id(name)}-error`);
      error.textContent = message || '';
      error.hidden = !message;
      if (message) controls.namedItem(name).setAttribute('aria-invalid', 'true');
      else controls.namedItem(name).removeAttribute('aria-invalid');
    }

    function validate() {
      const errors = {};
      if (!positions.includes(controls.position.value)) errors.position = 'Choose the position you want to apply for.';
      if (!controls.firstName.value.trim()) errors.firstName = 'Enter your first name.';
      else if (controls.firstName.value.trim().length > 60) errors.firstName = 'Use 60 characters or fewer for your first name.';
      if (!controls.lastName.value.trim()) errors.lastName = 'Enter your last name.';
      else if (controls.lastName.value.trim().length > 60) errors.lastName = 'Use 60 characters or fewer for your last name.';
      if (!controls.email.value.trim() || controls.email.validity.typeMismatch) errors.email = 'Enter a valid email address.';
      const phone = controls.phone.value.trim();
      if (phone && (!/^[+()\d .-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7)) errors.phone = 'Enter a valid contact number, or leave this optional field blank.';
      const resume = controls.resume.files[0];
      if (!resume) errors.resume = 'Attach your résumé to continue.';
      else if (!/\.(pdf|doc|docx)$/i.test(resume.name)) errors.resume = 'Choose a PDF or Word document (.pdf, .doc or .docx).';
      else if (resume.name.length > 160 || /[\\/:<>"|?*]/.test(resume.name) || resume.name.startsWith('.')) errors.resume = 'Rename your résumé using a shorter, simple filename, then select it again.';
      else if (resume.size === 0) errors.resume = 'This file is empty. Choose a résumé with content.';
      else if (resume.size > maxResumeBytes) errors.resume = 'Your résumé must be 5 MB or smaller.';
      if (!controls.consent.checked) errors.consent = 'Please confirm your consent before continuing.';
      ['position', 'firstName', 'lastName', 'email', 'phone', 'message', 'resume', 'consent'].forEach(name => setError(name, errors[name]));
      const first = Object.keys(errors)[0];
      if (first) controls.namedItem(first).focus();
      return !first;
    }

    function showForm() {
      result.hidden = true;
      result.replaceChildren();
      form.hidden = false;
      heading.textContent = 'Apply for a position';
      heading.focus({ preventScroll: true });
    }

    function selectPosition(position) {
      if (sending) return;
      showForm();
      controls.position.value = position;
      setError('position', '');
      updateSelectedPosition();
      heading.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      controls.firstName.focus({ preventScroll: true });
    }

    function updateSelectedPosition() {
      container.querySelectorAll('[data-careers-position]').forEach(button => {
        const selected = button.dataset.careersPosition === controls.position.value;
        button.closest('li').classList.toggle('careers-role-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    }

    function setAvailability() {
      if (destroyed) return;
      submit.disabled = checking || sending;
      for (const control of controls) if (control !== submit) control.disabled = sending;
      submit.textContent = checking ? 'Checking availability…' : sending ? 'Sending application…' : enabled ? 'Submit application' : 'Review application';
      status.classList.toggle('careers-notice-live', enabled);
      if (!checking) {
        status.textContent = enabled
          ? 'Apply online. Your application and attached résumé will be emailed directly to our recruitment team.'
          : 'Application preview: select your résumé and review your details. Online submission is not connected yet, so nothing will be sent.';
        submitHelp.textContent = enabled
          ? 'By submitting, you send your details and attached résumé to the RRC recruitment team.'
          : 'In this preview, your résumé stays on this device. No application or attachment is sent.';
      }
    }

    function showPreview() {
      const resume = controls.resume.files[0];
      heading.textContent = 'Review your application';
      form.hidden = true;
      result.hidden = false;
      result.innerHTML = `<p class="careers-not-sent">Not sent — preview only</p><p>Your details are ready for review. Online submission must be connected before this website can email your application.</p><dl class="careers-summary"><div><dt>Position</dt><dd>${escapeHTML(controls.position.value)}</dd></div><div><dt>First name</dt><dd>${escapeHTML(controls.firstName.value.trim())}</dd></div><div><dt>Last name</dt><dd>${escapeHTML(controls.lastName.value.trim())}</dd></div><div><dt>Email</dt><dd>${escapeHTML(controls.email.value.trim())}</dd></div><div><dt>Résumé selected</dt><dd>${escapeHTML(resume.name)}</dd></div><div><dt>Recruitment email</dt><dd>${recipient}</dd></div></dl><p class="careers-help">The résumé has not been uploaded or emailed. Your entries are cleared when you leave this page.</p><button class="btn btn-secondary" type="button" data-careers-edit>Edit application</button>`;
      heading.focus();
      heading.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    }

    function readResume(file) {
      return new Promise((resolve, reject) => {
        reader = new FileReader();
        reader.onload = () => {
          const data = String(reader.result || '');
          reader = null;
          resolve(data.slice(data.indexOf(',') + 1));
        };
        reader.onerror = () => { reader = null; reject(new Error('The résumé could not be read. Please select it again and retry.')); };
        reader.onabort = () => { reader = null; reject(new DOMException('Application cancelled.', 'AbortError')); };
        reader.readAsDataURL(file);
      });
    }

    async function sendApplication() {
      sending = true;
      errorBox.hidden = true;
      errorBox.textContent = '';
      form.setAttribute('aria-busy', 'true');
      setAvailability();
      const resume = controls.resume.files[0];
      const application = {
        position: controls.position.value,
        firstName: controls.firstName.value.trim(),
        lastName: controls.lastName.value.trim(),
        email: controls.email.value.trim(),
        phone: controls.phone.value.trim(),
        message: controls.message.value.trim(),
        consent: controls.consent.checked
      };
      try {
        const dataBase64 = await readResume(resume);
        if (destroyed) return;
        const extension = resume.name.split('.').pop().toLowerCase();
        const fallbackTypes = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        const response = await fetch('/api/recruitment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          signal: lifetime.signal,
          body: JSON.stringify({ ...application, resume: { name: resume.name, type: resume.type || fallbackTypes[extension], dataBase64 } })
        });
        const responseBody = await response.json().catch(() => ({}));
        if (destroyed) return;
        if (!response.ok || responseBody.sent !== true) throw new Error(responseBody.error || `We could not confirm delivery. Contact ${recipient} before retrying to avoid a duplicate application.`);
        form.reset();
        controls.resume.value = '';
        container.querySelector(`#${id('file-state')}`).textContent = '';
        updateSelectedPosition();
        form.hidden = true;
        result.hidden = false;
        heading.textContent = 'Application submitted';
        result.innerHTML = `<p class="careers-success">Thank you for applying to RRC.</p><p>Your application for <strong>${escapeHTML(application.position)}</strong> and attached résumé have been accepted by the mail service for delivery to <strong>${recipient}</strong>.</p><p>Our recruitment team will review your application and contact you if further information is needed.</p><button class="btn btn-secondary" type="button" data-careers-edit>View application form</button>`;
        heading.focus();
        heading.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      } catch (error) {
        if (destroyed || error.name === 'AbortError') return;
        errorBox.textContent = error instanceof TypeError ? `We could not confirm delivery. Contact ${recipient} before retrying to avoid a duplicate application.` : error.message;
        errorBox.hidden = false;
        errorBox.focus();
      } finally {
        sending = false;
        if (!destroyed) {
          form.removeAttribute('aria-busy');
          setAvailability();
        }
      }
    }

    container.addEventListener('click', event => {
      const apply = event.target.closest('[data-careers-position]');
      if (apply) selectPosition(apply.dataset.careersPosition);
      if (event.target.closest('[data-careers-edit]')) showForm();
      const explore = event.target.closest('.careers-banner-link');
      if (explore) {
        event.preventDefault();
        container.querySelector(`#${id('vacancies')}`).scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }
    }, { signal: lifetime.signal });
    form.addEventListener('change', event => {
      if (event.target.name) setError(event.target.name, '');
      if (event.target.name === 'position') updateSelectedPosition();
      if (event.target.name === 'resume') {
        const file = controls.resume.files[0];
        container.querySelector(`#${id('file-state')}`).textContent = file ? `Selected: ${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : '';
      }
    }, { signal: lifetime.signal });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (checking || sending || !validate()) return;
      if (!enabled) showPreview();
      else sendApplication();
    }, { signal: lifetime.signal });

    fetch('/api/recruitment/status', { credentials: 'same-origin', signal: lifetime.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : { enabled: false })
      .then(statusResult => { if (!destroyed) enabled = statusResult.enabled === true; })
      .catch(() => { enabled = false; })
      .finally(() => { checking = false; setAvailability(); });

    const instance = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        lifetime.abort();
        if (reader && reader.readyState === FileReader.LOADING) reader.abort();
        reader = null;
        form.reset();
        controls.resume.value = '';
        result.replaceChildren();
        instances.delete(container);
      }
    };
    instances.set(container, instance);
    return instance;
  }

  window.RRCCareers = Object.freeze({ mount, positions });
}());
