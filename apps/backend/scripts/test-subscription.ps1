# PowerShell script to test subscription endpoints

$baseUrl = "http://localhost:3001/api"

Write-Host "🧪 Testing Subscription API" -ForegroundColor Cyan
Write-Host ""

# First, login to get a token
Write-Host "1️⃣ Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@bhanjyang.coop.np"
    password = "Password123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login Successful!" -ForegroundColor Green
    Write-Host ""
    
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    # Test 2: Get Current Subscription
    Write-Host "2️⃣ Getting Current Subscription..." -ForegroundColor Yellow
    try {
        $subscription = Invoke-RestMethod -Uri "$baseUrl/subscription" -Method Get -Headers $headers
        Write-Host "✅ Subscription Retrieved!" -ForegroundColor Green
        Write-Host "   Plan: $($subscription.subscription.plan.name)" -ForegroundColor Gray
        Write-Host "   Price: `$$($subscription.subscription.plan.monthlyPrice)/month" -ForegroundColor Gray
        Write-Host "   Status: $($subscription.subscription.status)" -ForegroundColor Gray
        Write-Host "   Modules: $($subscription.subscription.plan.enabledModules -join ', ')" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "❌ Get Subscription Failed: $_" -ForegroundColor Red
        Write-Host ""
    }
    
    # Test 3: Get Available Plans
    Write-Host "3️⃣ Getting Available Plans..." -ForegroundColor Yellow
    try {
        $plans = Invoke-RestMethod -Uri "$baseUrl/subscription/plans" -Method Get -Headers $headers
        Write-Host "✅ Plans Retrieved!" -ForegroundColor Green
        foreach ($plan in $plans.plans) {
            Write-Host "   - $($plan.name): `$$($plan.monthlyPrice)/month - Modules: $($plan.enabledModules -join ', ')" -ForegroundColor Gray
        }
        Write-Host ""
    } catch {
        Write-Host "❌ Get Plans Failed: $_" -ForegroundColor Red
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Login Failed: $_" -ForegroundColor Red
    Write-Host "   Make sure the backend server is running (pnpm dev)" -ForegroundColor Yellow
}

Write-Host "✨ Testing Complete!" -ForegroundColor Cyan

