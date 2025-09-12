param(
  [string]$ImageName = "cf2dns:latest",
  [string]$Token,
  [string]$AdminPassword
)

if (-not $Token) {
  if ($env:CLOUDFLARE_API_TOKEN) { $Token = $env:CLOUDFLARE_API_TOKEN }
}

if (-not $Token) {
  Write-Error "CLOUDFLARE_API_TOKEN not provided. Pass -Token or set env var."
  exit 1
}

$envArgs = @()
$envArgs += @('-e', "CLOUDFLARE_API_TOKEN=$Token")
if (-not $AdminPassword -and $env:ADMIN_PASSWORD) { $AdminPassword = $env:ADMIN_PASSWORD }
if ($AdminPassword) { $envArgs += @('-e', "ADMIN_PASSWORD=$AdminPassword") }

docker run --name cf2dns --rm -p 3000:3000 `
  @envArgs `
  $ImageName
