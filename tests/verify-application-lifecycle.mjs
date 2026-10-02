import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class TestElement {
  constructor() { this.innerHTML = ''; this.listeners = new Map(); }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(handler); }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  querySelector() { return { focus() {}, scrollIntoView() {}, setAttribute() {}, remove() {}, id: 'test-help' }; }
  contains() { return true; }
  replaceChildren() { this.innerHTML = ''; }
  emit(type, target) { for (const handler of [...(this.listeners.get(type) || [])]) handler({ target, preventDefault() {} }); }
  countListeners() { return [...this.listeners.values()].reduce((sum, list) => sum + list.size, 0); }
}

const context = vm.createContext({ Element: TestElement, window: {}, Date, console });
const source = await readFile(new URL('../website/application.js', import.meta.url), 'utf8');
vm.runInContext(source, context);
const container = new TestElement();
const property = { title: 'Test <img src=x onerror="alert(1)">', area: 'Sample & area', type: 'residential' };
const original = context.window.RRCApplication.mount(container, { property });
assert.ok(container.innerHTML.includes('Test &lt;img'));
assert.ok(!container.innerHTML.includes('<img src=x'));
const input = (field, value) => container.emit('input', { dataset: { field }, type: typeof value === 'boolean' ? 'checkbox' : 'text', value, checked: value, removeAttribute() {}, setAttribute() {} });
const submit = () => container.emit('submit', { matches: value => value === 'form' });
const click = action => container.emit('click', { closest: () => ({ dataset: { action } }) });
const fields = values => Object.entries(values).forEach(([field, value]) => input(field, value));

fields({ moveIn: '2099-12-01', leaseTerm: '12' }); submit();
assert.ok(container.innerHTML.includes('Step 2 of 5'));
fields({ fullName: '<script>sample</script>', mobile: '09170000000', email: 'sample@example.test', address: 'Sample address', incomeSource: 'other' }); submit();
assert.ok(container.innerHTML.includes('Step 3 of 5'));
fields({ emergencyName: 'Sample contact', emergencyRelationship: 'Sample relationship', emergencyMobile: '09170000001' }); submit();
assert.ok(container.innerHTML.includes('Step 4 of 5'));
const fileTarget = { dataset: { document: 'identity' }, files: Array.from({ length: 7 }, (_, index) => ({ name: `sample-${index}.pdf`, size: 100, type: 'application/pdf', arrayBuffer() { throw new Error('Contents must not be read'); } })), value: 'selected' };
container.emit('change', fileTarget);
assert.equal(fileTarget.value, '');
assert.ok(container.innerHTML.includes('Maximum 5 sample files total'));
assert.ok(!container.innerHTML.includes('sample-5.pdf'));
submit();
assert.ok(container.innerHTML.includes('&lt;script&gt;sample&lt;/script&gt;'));
assert.ok(!container.innerHTML.includes('<script>sample</script>'));
fields({ accuracy: true, previewAcknowledgement: true, typedName: 'Sample tenant' }); submit();
assert.ok(container.innerHTML.includes('Application received'));
assert.ok(!container.innerHTML.includes('sample@example.test'));
click('restart');
assert.ok(container.innerHTML.includes('Step 1 of 5'));
assert.equal(container.countListeners(), 4);
original.destroy();
assert.equal(container.innerHTML, '');
assert.equal(container.countListeners(), 0);
console.log('PASS: original controller cleans up the restarted form.');
console.log('PASS: residential preview flow, escaped property/input text, five-file cap, no file reads, selected File references released, and completion clears displayed answers.');

const commercialController=context.window.RRCApplication.mount(container,{property:{title:'Synthetic office',area:'Test area',type:'commercial'}});
fields({moveIn:'2099-12-01',leaseTerm:'24'}); submit();
assert.ok(container.innerHTML.includes('Step 2 of 5'));
fields({businessName:'Synthetic business',legalType:'sole',businessNature:'Office services',businessAddress:'Synthetic business address',fullName:'Synthetic representative',representativeRole:'Owner',mobile:'09170000000',email:'synthetic@example.test'}); submit();
assert.ok(container.innerHTML.includes('Step 3 of 5'));
fields({intendedUse:'Office',operatingHours:'Monday to Friday',fitOut:'yes'}); submit();
assert.ok(container.innerHTML.includes('Step 3 of 5'));
assert.ok(container.innerHTML.includes('aria-invalid="true"'));
fields({fitOutDetails:'Synthetic layout and workstations'}); submit();
assert.ok(container.innerHTML.includes('Step 4 of 5'));
assert.ok(container.innerHTML.includes('DTI registration'));
submit();
assert.ok(container.innerHTML.includes('Step 5 of 5'));
assert.ok(container.innerHTML.includes('Synthetic layout and workstations'));
fields({accuracy:true,previewAcknowledgement:true,typedName:'Synthetic representative'}); submit();
assert.ok(container.innerHTML.includes('Application received'));
assert.ok(!container.innerHTML.includes('synthetic@example.test'));
commercialController.destroy();
assert.equal(container.countListeners(),0);
console.log('PASS: commercial preview, mandatory fit-out details, relevant registration checklist, review and completion cleanup.');
