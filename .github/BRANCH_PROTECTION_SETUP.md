# Branch Protection Rules Setup Guide

This guide will help you set up branch protection rules to ensure code quality and prevent direct pushes to main branches.

## Why Branch Protection?

Branch protection rules:

- ✅ Require pull request reviews
- ✅ Require CI checks to pass
- ✅ Prevent force pushes
- ✅ Prevent branch deletion
- ✅ Ensure code quality before merging

## Setup Instructions

### Step 1: Access Branch Protection Settings

1. Go to your GitHub repository
2. Click on **Settings** → **Branches**
3. Click **Add rule** or **Add branch protection rule**

### Step 2: Configure Rule for `main` Branch

#### Branch Name Pattern

```
main
```

#### Protection Settings

**1. Require a pull request before merging**

- ✅ Check this box
- ✅ Require approvals: **1** (or more based on your team size)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if you have a CODEOWNERS file)

**2. Require status checks to pass before merging**

- ✅ Check this box
- ✅ Require branches to be up to date before merging
- ✅ Select the following required status checks:
  - `lint` (Lint job)
  - `type-check` (Type Check job)
  - `build` (Build job)
  - `test-backend` (Backend Tests job)
  - `test-frontend` (Frontend Tests job)
  - `e2e-tests` (E2E Tests job) - Optional, can be made non-blocking

**3. Require conversation resolution before merging**

- ✅ Check this box (recommended)
- Ensures all PR comments are addressed

**4. Do not allow bypassing the above settings**

- ✅ Check this box (recommended)
- Prevents admins from bypassing rules

**5. Restrict who can push to matching branches**

- ✅ Check this box (optional but recommended)
- Only allow specific teams/users to push directly

**6. Allow force pushes**

- ❌ Leave unchecked
- Prevents rewriting history

**7. Allow deletions**

- ❌ Leave unchecked
- Prevents accidental branch deletion

**8. Require linear history**

- ⚠️ Optional (recommended for cleaner history)
- Prevents merge commits

**9. Include administrators**

- ✅ Check this box (recommended)
- Applies rules to admins too

**10. Allow specified actors to bypass required pull requests**

- ⚠️ Optional
- Only if you have automated bots that need to push

### Step 3: Configure Rule for `develop` Branch (Optional)

If you use a `develop` branch:

**Branch Name Pattern:**

```
develop
```

**Settings:**

- Similar to `main` but can be less strict
- Require 1 approval (instead of 2)
- All status checks required
- Allow force pushes: ❌ No
- Allow deletions: ❌ No

### Step 4: Save the Rule

Click **Create** or **Save changes** to apply the rule.

## Recommended Configuration Summary

### Main Branch Protection

```yaml
Branch: main
Protections:
  - Require pull request: Yes (1 approval)
  - Require status checks: Yes
    Required checks:
      - lint
      - type-check
      - build
      - test-backend
      - test-frontend
      - e2e-tests (optional)
  - Require branches up to date: Yes
  - Require conversation resolution: Yes
  - Do not allow bypassing: Yes
  - Restrict pushes: Yes (specific teams)
  - Allow force pushes: No
  - Allow deletions: No
  - Include administrators: Yes
```

### Develop Branch Protection

```yaml
Branch: develop
Protections:
  - Require pull request: Yes (1 approval)
  - Require status checks: Yes
    Required checks:
      - lint
      - type-check
      - build
      - test-backend
      - test-frontend
  - Require branches up to date: Yes
  - Require conversation resolution: Yes
  - Do not allow bypassing: Yes
  - Allow force pushes: No
  - Allow deletions: No
  - Include administrators: Yes
```

## Status Check Names

The status check names in GitHub Actions are derived from the job names in `.github/workflows/ci.yml`:

- `lint` → From "Lint" job
- `type-check` → From "Type Check" job
- `build` → From "Build" job
- `test-backend` → From "Backend Tests" job
- `test-frontend` → From "Frontend Tests" job
- `e2e-tests` → From "E2E Tests" job

**Note:** Status checks will only appear after the workflows have run at least once.

## Verification

After setting up branch protection:

1. **Test with a PR:**
   - Create a test branch
   - Make a small change
   - Open a pull request to `main`
   - Verify that:
     - ✅ You cannot merge without approval
     - ✅ You cannot merge if CI fails
     - ✅ You cannot merge if branch is out of date

2. **Test direct push:**
   - Try to push directly to `main`
   - Should be blocked (if "Restrict pushes" is enabled)

3. **Test force push:**
   - Try to force push to `main`
   - Should be blocked

## Troubleshooting

### Status Checks Not Appearing

**Problem:** Required status checks don't show up in the dropdown.

**Solution:**

1. Make sure workflows have run at least once
2. Push a change to trigger workflows
3. Wait for workflows to complete
4. Refresh the branch protection settings page
5. Status checks should now appear

### Cannot Merge PR

**Problem:** PR shows "Required status checks must pass" but all checks passed.

**Solution:**

1. Check if branch is up to date
2. Click "Update branch" if needed
3. Wait for new checks to complete
4. Verify all required checks are passing

### Admin Cannot Bypass

**Problem:** Admin cannot merge even though they should be able to.

**Solution:**

1. Check "Do not allow bypassing" setting
2. If checked, even admins must follow rules
3. Uncheck if you want admins to bypass (not recommended)

## Advanced: CODEOWNERS File

Create a `.github/CODEOWNERS` file to automatically request reviews from specific teams:

```
# Global owners
* @your-team

# Backend code
/apps/backend/ @backend-team

# Frontend code
/apps/frontend-web/ @frontend-team

# Database schema
/packages/db-schema/ @backend-team @dba-team

# Documentation
/docs/ @docs-team
```

Then enable "Require review from Code Owners" in branch protection.

## Best Practices

1. **Start Strict:** Begin with strict rules, relax if needed
2. **Require Reviews:** Always require at least 1 approval
3. **Require CI:** Never merge code that fails tests
4. **Keep Updated:** Require branches to be up to date
5. **Protect Main:** Main branch should have the strictest rules
6. **Document Exceptions:** If bypassing is needed, document why

## Example Workflow

1. Developer creates feature branch: `feature/new-feature`
2. Developer pushes changes and opens PR to `main`
3. CI workflows run automatically
4. If CI passes, code owner reviews PR
5. After approval and CI passing, PR can be merged
6. Merge creates a commit on `main`
7. CD workflow triggers and deploys to production

## Next Steps

After setting up branch protection:

1. ✅ Test with a sample PR
2. ✅ Verify all checks are working
3. ✅ Document your team's workflow
4. ✅ Train team members on the process
