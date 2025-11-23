# PowerShell script to test the API endpoints

$baseUrl = "http://localhost:3001/api"

Write-Host "🧪 Testing MyERP API" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/../health" -Method Get
    Write-Host "✅ Health Check: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Login
Write-Host "2️⃣ Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@bhanjyang.coop.np"
    password = "Password123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login Successful!" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.firstName) $($loginResponse.user.lastName)" -ForegroundColor Gray
    Write-Host "   Cooperative: $($loginResponse.cooperative.name)" -ForegroundColor Gray
    Write-Host "   Enabled Modules: $($loginResponse.cooperative.enabledModules -join ', ')" -ForegroundColor Gray
    
    $token = $loginResponse.token
    Write-Host "   Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
    
    # Test 3: Get Current User
    Write-Host "3️⃣ Testing Get Current User (GET /auth/me)..." -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    try {
        $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
        Write-Host "✅ Get Current User Successful!" -ForegroundColor Green
        Write-Host "   Email: $($meResponse.user.email)" -ForegroundColor Gray
        Write-Host "   Cooperative: $($meResponse.cooperative.name)" -ForegroundColor Gray
        Write-Host "   Subdomain: $($meResponse.cooperative.subdomain)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Get Current User Failed: $_" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test 4: Get Profile
    Write-Host "4️⃣ Testing Get Profile (GET /onboarding/profile)..." -ForegroundColor Yellow
    try {
        $profileResponse = Invoke-RestMethod -Uri "$baseUrl/onboarding/profile" -Method Get -Headers $headers
        Write-Host "✅ Get Profile Successful!" -ForegroundColor Green
        Write-Host "   Address: $($profileResponse.profile.address)" -ForegroundColor Gray
        Write-Host "   Phone: $($profileResponse.profile.phone)" -ForegroundColor Gray
        Write-Host "   Website: $($profileResponse.profile.website)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Get Profile Failed: $_" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test 5: Update Profile
    Write-Host "5️⃣ Testing Update Profile (PUT /onboarding/profile)..." -ForegroundColor Yellow
    $updateBody = @{
        description = "Bhanjyang Saving & Credit Cooperative Society Ltd. - Serving the community with financial services in Rupa RM-5, Deurali, Kaski."
    } | ConvertTo-Json
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/onboarding/profile" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers
        Write-Host "✅ Update Profile Successful! ($($updateResponse.message))" -ForegroundColor Green
        Write-Host "   Description updated" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Update Profile Failed: $_" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Login Failed: $_" -ForegroundColor Red
    Write-Host "   Make sure the backend server is running (pnpm dev)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Testing Complete!" -ForegroundColor Cyan

