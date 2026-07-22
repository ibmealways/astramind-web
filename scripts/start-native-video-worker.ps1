param([string]$EnvironmentFile = ".env.worker")

$workerDirectory = Resolve-Path (Join-Path $PSScriptRoot "..\native-video-worker")
$environmentPath = Join-Path $workerDirectory $EnvironmentFile

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed. Install Docker with NVIDIA Container Toolkit support on the GPU host."
}
if (-not (Test-Path -LiteralPath $environmentPath)) {
  throw "Missing $environmentPath. Copy .env.worker.example to .env.worker and set a private token."
}

docker compose --env-file $environmentPath -f (Join-Path $workerDirectory "compose.yaml") up --build -d
if ($LASTEXITCODE -ne 0) { throw "Native video worker failed to start." }
Write-Output "Worker started. Run scripts/check-native-video-worker.ps1 with the matching token to verify CUDA readiness."
