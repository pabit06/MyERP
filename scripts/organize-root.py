#!/usr/bin/env python3
"""Script to organize root directory files into docs subdirectories."""

import os
import shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent
DOCS = ROOT / "docs"

# File mappings: (source_file, destination_directory)
FILE_MAPPINGS = [
    # Setup files
    ("SETUP_COMPLETE.md", "setup"),
    ("SECRETS_SETUP_COMPLETE.md", "setup"),
    ("BROWSER_SETUP_GUIDE.md", "setup"),
    ("START_HERE.md", "setup"),
    ("GITHUB_SECRETS_TO_ADD.md", "setup"),
    ("GITHUB_SECRETS_VALUES.md", "setup"),
    ("JWT_SECRET.txt", "setup"),
    ("JWT_SECRET_GENERATED.txt", "setup"),
    ("GENERATED_SECRETS.txt", "setup"),
    
    # CI/CD files
    ("CI_CD_READY.md", "ci-cd"),
    ("CICD_CONFIGURATION_COMPLETE.md", "ci-cd"),
    ("CICD_SETUP.md", "ci-cd"),
    ("README_CI_CD.md", "ci-cd"),
    ("TEST_CI_WORKFLOW.md", "ci-cd"),
    ("WORKFLOWS_TRIGGERED.md", "ci-cd"),
    ("WORKFLOW_TEST_STATUS.md", "ci-cd"),
    
    # Status files
    ("FRONTEND_MIGRATION_COMPLETE.md", "status"),
    ("SECURITY_ENHANCEMENTS_COMPLETE.md", "status"),
    ("SECURITY_INTEGRATION_COMPLETE.md", "status"),
    ("SECURITY_INTEGRATION_EXTENDED.md", "status"),
    ("SECURITY_INTEGRATION_FINAL.md", "status"),
    ("PERFORMANCE_MONITORING_COMPLETE.md", "status"),
    ("PERFORMANCE_MONITORING_SUMMARY.md", "status"),
    ("BROWSER_STATUS.md", "status"),
    ("BROWSER_STATUS_REPORT.md", "status"),
    ("BROWSER_CHECK_SUMMARY.md", "status"),
    ("DOCUMENTATION_ORGANIZATION_COMPLETE.md", "status"),
    ("DOCUMENTATION_ORGANIZATION_STATUS.md", "status"),
    ("ORGANIZATION_VERIFICATION.md", "status"),
    
    # Roadmap files
    ("NEXT_STEPS_ROADMAP.md", "roadmap"),
    ("NEXT_ACTIONS.md", "roadmap"),
    ("PROJECT_IMPROVEMENTS.md", "roadmap"),
    
    # Assessment files
    ("FOLDER_STRUCTURE_ASSESSMENT.md", "assessment"),
    
    # General docs
    ("QUICK_FIX_DUPLICATE_COMPONENTS.md", ""),  # Root of docs
    ("VALIDATION_MIDDLEWARE_SUMMARY.md", ""),  # Root of docs
]

def main():
    moved_count = 0
    skipped_count = 0
    
    for filename, subdir in FILE_MAPPINGS:
        source = ROOT / filename
        if not source.exists():
            print(f"⏭️  Skipped (not found): {filename}")
            skipped_count += 1
            continue
        
        if subdir:
            dest_dir = DOCS / subdir
        else:
            dest_dir = DOCS
        
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / filename
        
        try:
            shutil.move(str(source), str(dest))
            print(f"✅ Moved: {filename} -> docs/{subdir if subdir else ''}")
            moved_count += 1
        except Exception as e:
            print(f"❌ Error moving {filename}: {e}")
    
    print(f"\n📊 Summary: {moved_count} moved, {skipped_count} skipped")

if __name__ == "__main__":
    main()
