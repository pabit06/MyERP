# Script to organize root directory markdown files

$root = "e:\MyERP"
Set-Location $root

# Define file mappings: source file -> destination directory
$fileMappings = @{
    "BROWSER_CHECK_SUMMARY.md" = "docs\setup"
    "BROWSER_SETUP_GUIDE.md" = "docs\setup"
    "BROWSER_STATUS.md" = "docs\setup"
    "BROWSER_STATUS_REPORT.md" = "docs\setup"
    "GITHUB_SECRETS_TO_ADD.md" = "docs\setup"
    "GITHUB_SECRETS_VALUES.md" = "docs\setup"
    "CI_CD_READY.md" = "docs\status"
    "CICD_CONFIGURATION_COMPLETE.md" = "docs\status"
    "DOCUMENTATION_ORGANIZATION_COMPLETE.md" = "docs\status"
    "DOCUMENTATION_ORGANIZATION_STATUS.md" = "docs\status"
    "FRONTEND_MIGRATION_COMPLETE.md" = "docs\status"
    "ORGANIZATION_VERIFICATION.md" = "docs\status"
    "PERFORMANCE_MONITORING_COMPLETE.md" = "docs\status"
    "PERFORMANCE_MONITORING_SUMMARY.md" = "docs\status"
    "SECRETS_SETUP_COMPLETE.md" = "docs\status"
    "SECURITY_ENHANCEMENTS_COMPLETE.md" = "docs\status"
    "SECURITY_INTEGRATION_COMPLETE.md" = "docs\status"
    "SECURITY_INTEGRATION_EXTENDED.md" = "docs\status"
    "SECURITY_INTEGRATION_FINAL.md" = "docs\status"
    "TEST_CI_WORKFLOW.md" = "docs\status"
    "WORKFLOW_TEST_STATUS.md" = "docs\status"
    "WORKFLOWS_TRIGGERED.md" = "docs\status"
    "README_CI_CD.md" = "docs\ci-cd"
    "NEXT_ACTIONS.md" = "docs\roadmap"
    "NEXT_STEPS_ROADMAP.md" = "docs\roadmap"
    "PROJECT_IMPROVEMENTS.md" = "docs\roadmap"
    "FOLDER_STRUCTURE_ASSESSMENT.md" = "docs\assessment"
    "QUICK_FIX_DUPLICATE_COMPONENTS.md" = "docs\implementation"
    "VALIDATION_MIDDLEWARE_SUMMARY.md" = "docs\implementation"
}

$moved = 0
$skipped = 0

foreach ($file in $fileMappings.Keys) {
    $sourcePath = Join-Path $root $file
    $destDir = Join-Path $root $fileMappings[$file]
    $destPath = Join-Path $destDir $file
    
    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if (Test-Path $destPath) {
            Write-Host "Skipping $file - already exists in destination"
            Remove-Item $sourcePath -Force
            $skipped++
        } else {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "Moved $file to $($fileMappings[$file])"
            $moved++
        }
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "`nSummary: Moved $moved files, Skipped $skipped files"
