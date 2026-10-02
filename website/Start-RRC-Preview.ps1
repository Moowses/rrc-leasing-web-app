$ErrorActionPreference = 'Stop'

# Prefer the Codex bundled runtime when it is present, then use Node.js on PATH.
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (Test-Path -LiteralPath $bundledNode -PathType Leaf) {
    $previewNode = $bundledNode
} else {
    $nodeCommand = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $nodeCommand) {
        throw 'Node.js 20 or newer is required. Install Node.js, then run this script again.'
    }
    $previewNode = $nodeCommand.Source
}

& $previewNode (Join-Path $PSScriptRoot 'server.mjs')
exit $LASTEXITCODE
