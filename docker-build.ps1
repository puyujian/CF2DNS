param(
  [string]$ImageName = "cf2dns:latest"
)

Write-Host "Building Docker image: $ImageName"
docker build -t $ImageName .
Write-Host "Done. Run with:"
Write-Host "docker run --rm -p 3000:3000 -e CLOUDFLARE_API_TOKEN=... $ImageName"

