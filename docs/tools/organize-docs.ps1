# Script to organize root documentation files
# Run this from the project root: .\docs\organize-docs.ps1

$ErrorActionPreference = "Stop"

# Ensure directories exist
$directories = @("docs\status", "docs\setup", "docs\roadmap", "docs\assessment")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir"
    }
}

# Handle setup file conflict
if (Test-Path "docs\setup" -PathType Leaf) {
    Move-Item "docs\setup" "docs\DATABASE_SETUP.md" -Force
    Write-Host "Renamed setup file to DATABASE_SETUP.md"
}

# Status files
$statusFiles = @(
    "BROWSER_CHECK_SUMMARY.md",
    "BROWSER_STATUS_REPORT.md",
    "BROWSER_STATUS.md",
    "CI_CD_READY.md",
    "CICD_CONFIGURATION_COMPLETE.md",
    "FRONTEND_MIGRATION_COMPLETE.md",
    "PERFORMANCE_MONITORING_COMPLETE.md",
    "PERFORMANCE_MONITORING_SUMMARY.md",
    "SECRETS_SETUP_COMPLETE.md",
    "SECURITY_ENHANCEMENTS_COMPLETE.md",
    "SECURITY_INTEGRATION_COMPLETE.md",
    "SECURITY_INTEGRATION_EXTENDED.md",
    "SECURITY_INTEGRATION_FINAL.md",
    "SETUP_COMPLETE.md",
    "WORKFLOW_TEST_STATUS.md",
    "WORKFLOWS_TRIGGERED.md"
)

# Setup files
$setupFiles = @(
    "BROWSER_SETUP_GUIDE.md",
    "CICD_SETUP.md",
    "GITHUB_SECRETS_TO_ADD.md",
    "GITHUB_SECRETS_VALUES.md",
    "README_CI_CD.md",
    "TEST_CI_WORKFLOW.md"
)

# Roadmap files
$roadmapFiles = @(
    "NEXT_STEPS_ROADMAP.md",
    "PROJECT_IMPROVEMENTS.md"
)

# Assessment files
$assessmentFiles = @(
    "FOLDER_STRUCTURE_ASSESSMENT.md",
    "QUICK_FIX_DUPLICATE_COMPONENTS.md",
    "VALIDATION_MIDDLEWARE_SUMMARY.md"
)

# Secret files
$secretFiles = @(
    "GENERATED_SECRETS.txt",
    "JWT_SECRET_GENERATED.txt",
    "JWT_SECRET.txt"
)

# Move files
$moved = 0
foreach ($file in $statusFiles) {
    if (Test-Path $file) {
        Move-Item $file "docs\status\" -Force
        $moved++
        Write-Host "Moved: $file -> docs\status\"
    }
}

foreach ($file in $setupFiles) {
    if (Test-Path $file) {
        Move-Item $file "docs\setup\" -Force
        $moved++
        Write-Host "Moved: $file -> docs\setup\"
    }
}

foreach ($file in $roadmapFiles) {
    if (Test-Path $file) {
        Move-Item $file "docs\roadmap\" -Force
        $moved++
        Write-Host "Moved: $file -> docs\roadmap\"
    }
}

foreach ($file in $assessmentFiles) {
    if (Test-Path $file) {
        Move-Item $file "docs\assessment\" -Force
        $moved++
        Write-Host "Moved: $file -> docs\assessment\"
    }
}

foreach ($file in $secretFiles) {
    if (Test-Path $file) {
        Move-Item $file "docs\setup\" -Force
        $moved++
        Write-Host "Moved: $file -> docs\setup\"
    }
}

Write-Host "`nTotal files moved: $moved"
Write-Host "Documentation organization complete!"
