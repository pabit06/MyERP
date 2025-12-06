# Generate GitHub Secrets for CI/CD (PowerShell)
# This script generates secure values for GitHub Actions secrets

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "GitHub Secrets Generator for MyERP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Generate JWT_SECRET
$jwtSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
# Alternative: Use Node.js if available
try {
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>$null
    if (-not $jwtSecret) {
        $jwtSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    }
} catch {
    $jwtSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
}

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "REQUIRED SECRETS FOR CI" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. JWT_SECRET" -ForegroundColor Green
Write-Host "   Value: $jwtSecret"
Write-Host "   Description: Secret key for JWT token signing (minimum 32 characters)"
Write-Host ""

Write-Host "2. JWT_EXPIRES_IN" -ForegroundColor Green
Write-Host "   Value: 7d"
Write-Host "   Description: JWT token expiration time"
Write-Host ""

Write-Host "3. NEXT_PUBLIC_API_URL" -ForegroundColor Green
Write-Host "   Value: https://api.yourdomain.com/api"
Write-Host "   Description: Backend API URL for frontend builds"
Write-Host "   ⚠️  Update with your actual API URL" -ForegroundColor Red
Write-Host ""

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "OPTIONAL SECRETS FOR CD (Deployment)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add these only if you're setting up deployment:" -ForegroundColor Gray
Write-Host ""
Write-Host "See .github/SECRETS_SETUP.md for complete list" -ForegroundColor Gray
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "QUICK COPY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy JWT_SECRET to clipboard:" -ForegroundColor Green
Write-Host '$jwtSecret | Set-Clipboard' -ForegroundColor Yellow
$jwtSecret | Set-Clipboard
Write-Host "✅ JWT_SECRET copied to clipboard!" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Go to: Repository Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host "2. Click 'New repository secret'" -ForegroundColor White
Write-Host "3. Add each secret with the values above" -ForegroundColor White
Write-Host "4. Push a change to trigger workflows" -ForegroundColor White
Write-Host ""
