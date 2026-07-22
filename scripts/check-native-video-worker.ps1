param(
  [string]$Endpoint = "http://127.0.0.1:8189",
  [string]$Token = $env:ASTRAMIND_NATIVE_VIDEO_TOKEN
)

$headers = @{}
if ($Token) { $headers.Authorization = "Bearer $Token" }

try {
  $health = Invoke-RestMethod -Uri "$($Endpoint.TrimEnd('/'))/v1/health" -Headers $headers -TimeoutSec 10
  $health | ConvertTo-Json -Depth 8
  if (-not $health.ready) {
    Write-Error "The worker responded but is not generation-ready: $($health.error)"
    exit 2
  }
  Write-Output "AstraMind native video worker is ready."
} catch {
  Write-Error "Native video worker check failed: $($_.Exception.Message)"
  exit 1
}
