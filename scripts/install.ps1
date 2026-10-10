param([ValidateSet('desktop', 'web')][string]$Profile = 'desktop')
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required' }
$nodeMajor = & node -p 'parseInt(process.versions.node)'
if ($LASTEXITCODE -ne 0 -or [int]$nodeMajor -lt 20) { throw 'Node.js 20+ is required' }
$dshSnakeTemp = Join-Path ([IO.Path]::GetTempPath()) ('dsh-snake-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $dshSnakeTemp | Out-Null
try {
    $archive = Join-Path $dshSnakeTemp 'plugin.zip'
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/songyu00yo/dsh-snake/releases/download/v1.0.0-alpha.2/dsh-snake-v1.0.0-alpha.2.zip' -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $dshSnakeTemp
    & node (Join-Path $dshSnakeTemp 'dsh-snake/scripts/profile.mjs') install --profile $Profile
    if ($LASTEXITCODE -ne 0) { throw 'Plugin installation failed' }
} finally {
    Remove-Item -LiteralPath $dshSnakeTemp -Recurse -Force
}
