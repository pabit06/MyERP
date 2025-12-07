# Script to organize root directory files

# Create directories
$directories = @('docs\setup', 'docs\ci-cd', 'docs\status', 'docs\roadmap', 'docs\assessment', 'docs\implementation')
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir"
    }
}

# Setup files
$setupFiles = @('SETUP_COMPLETE.md', 'SECRETS_SETUP_COMPLETE.md', 'BROWSER_SETUP_GUIDE.md', 'BROWSER_STATUS.md', 'BROWSER_STATUS_REPORT.md', 'BROWSER_CHECK_SUMMARY.md', 'START_HERE.md', 'GITHUB_SECRETS_TO_ADD.md', 'GITHUB_SECRETS_VALUES.md', 'JWT_SECRET.txt', 'JWT_SECRET_GENERATED.txt', 'GENERATED_SECRETS.txt')
foreach ($file in $setupFiles) {
    if (Test-Path $file) {
        $dest = Join-Path 'docs\setup' $file
        Move-Item -Path $file -Destination $dest -Force -ErrorAction SilentlyContinue
        Write-Host "Moved: $file -> $dest"
    }
}

# CI/CD files
$cicdFiles = @('CI_CD_READY.md', 'CICD_CONFIGURATION_COMPLETE.md', 'CICD_SETUP.md', 'README_CI_CD.md')
foreach ($file in $cicdFiles) {
    if (Test-Path $file) {
        $dest = Join-Path 'docs\ci-cd' $file
        Move-Item -Path $file -Destination $dest -Force -ErrorAction SilentlyContinue
        Write-Host "Moved: $file -> $dest"
    }
}

# Status files
$statusFiles = @('FRONTEND_MIGRATION_COMPLETE.md', 'SECURITY_ENHANCEMENTS_COMPLETE.md', 'SECURITY_INTEGRATION_COMPLETE.md', 'SECURITY_INTEGRATION_EXTENDED.md', 'SECURITY_INTEGRATION_FINAL.md', 'PERFORMANCE_MONITORING_COMPLETE.md', 'PERFORMANCE_MONITORING_SUMMARY.md', 'DOCUMENTATION_ORGANIZATION_COMPLETE.md', 'DOCUMENTATION_ORGANIZATION_STATUS.md', 'ORGANIZATION_VERIFICATION.md', 'TEST_CI_WORKFLOW.md', 'WORKFLOWS_TRIGGERED.md', 'WORKFLOW_TEST_STATUS.md', 'SECRETS_SETUP_COMPLETE.md')
foreach ($file in $statusFiles) {
    if (Test-Path $file) {
        $dest = Join-Path 'docs\status' $file
        Move-Item -Path $file -Destination $dest -Force -ErrorAction SilentlyContinue
        Write-Host "Moved: $file -> $dest"
    }
}

# Roadmap files
$roadmapFiles = @('NEXT_STEPS_ROADMAP.md', 'NEXT_ACTIONS.md', 'PROJECT_IMPROVEMENTS.md')
foreach ($file in $roadmapFiles) {
    if (Test-Path $file) {
        $dest = Join-Path 'docs\roadmap' $file
        Move-Item -Path $file -Destination $dest -Force
        Write-Host "Moved: $file -> $dest"
    }
}

# Other files
if (Test-Path 'FOLDER_STRUCTURE_ASSESSMENT.md') {
    Move-Item -Path 'FOLDER_STRUCTURE_ASSESSMENT.md' -Destination 'docs\assessment\FOLDER_STRUCTURE_ASSESSMENT.md' -Force
    Write-Host "Moved: FOLDER_STRUCTURE_ASSESSMENT.md -> docs\assessment\"
}

if (Test-Path 'QUICK_FIX_DUPLICATE_COMPONENTS.md') {
    Move-Item -Path 'QUICK_FIX_DUPLICATE_COMPONENTS.md' -Destination 'docs\implementation\QUICK_FIX_DUPLICATE_COMPONENTS.md' -Force -ErrorAction SilentlyContinue
    Write-Host "Moved: QUICK_FIX_DUPLICATE_COMPONENTS.md -> docs\implementation\"
}

if (Test-Path 'VALIDATION_MIDDLEWARE_SUMMARY.md') {
    Move-Item -Path 'VALIDATION_MIDDLEWARE_SUMMARY.md' -Destination 'docs\implementation\VALIDATION_MIDDLEWARE_SUMMARY.md' -Force -ErrorAction SilentlyContinue
    Write-Host "Moved: VALIDATION_MIDDLEWARE_SUMMARY.md -> docs\implementation\"
}

Write-Host "`nOrganization complete!"
