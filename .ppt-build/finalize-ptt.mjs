import path from 'node:path';
import { pathToFileURL } from 'node:url';
const skill = process.env.SKILL_DIR;
const workspaceDir = process.env.WORKSPACE_DIR;
const finalPath = process.env.FINAL_PPTX;
const candidatePath = path.join(workspaceDir, '.ppt-build', 'rrc-property-operations-ptt-draft.pptx');
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);
const result = await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: process.env.RUNTIME_PYTHON,
  integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: 'design', families: ['Manrope', 'Source Sans 3'] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, '.codex-finalizer', `${path.basename(finalPath)}.validation.json`),
});
console.log(JSON.stringify(result, null, 2));
