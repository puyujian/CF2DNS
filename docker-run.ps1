param(
  [string]$ImageName = "cf2dns:latest",
  [string]$Token
)

if (-not $Token) {
  if ($env:CLOUDFLARE_API_TOKEN) { $Token = $env:CLOUDFLARE_API_TOKEN }
}

if (-not $Token) {
  Write-Error "CLOUDFLARE_API_TOKEN not provided. Pass -Token or set env var."
  exit 1
}

docker run --name cf2dns --rm -p 3000:3000 `
  -e CLOUDFLARE_API_TOKEN=$Token `
  $ImageName

