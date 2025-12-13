# MyERP Documentation

Welcome to the MyERP project documentation! This guide will help you navigate all available documentation.

## 📚 Quick Navigation

### 🚀 Getting Started

- **[Quick Start Guide](./setup/QUICK_START.md)** - Get up and running in 5 minutes
- **[Database Setup](./setup/DATABASE_SETUP.md)** - Configure PostgreSQL and run migrations
- **[Development Environment](./setup/DEVELOPMENT.md)** - Set up your local development environment

### 🐳 Deployment

- **[Docker Deployment](./deployment/DOCKER_DEPLOYMENT.md)** - Production deployment with Docker
- **[CI/CD Setup](./deployment/CICD_SETUP.md)** - GitHub Actions workflows
- **[Deployment Guide](./deployment/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions

### 🏗️ Architecture & Design

- **[Project Architecture](./architecture/ARCHITECTURE.md)** - System design and architecture
- **[Database Schema](./architecture/DATABASE_SCHEMA.md)** - Database structure and relationships
- **[API Documentation](./architecture/API_DOCUMENTATION.md)** - REST API endpoints and usage

### 🔐 Security & Access Control

- **[RBAC System](./security/RBAC.md)** - Role-Based Access Control
- **[Authentication](./security/AUTHENTICATION.md)** - Auth system and JWT
- **[Permissions](./security/PERMISSIONS.md)** - Permission management

### 🧪 Testing

- **[Testing Guide](./testing/TESTING_GUIDE.md)** - How to write and run tests
- **[Integration Tests](./testing/INTEGRATION_TESTS.md)** - Integration testing setup
- **[E2E Tests](./testing/E2E_TESTS.md)** - End-to-end testing with Playwright

### 📋 Features

- **[Core Banking System](./features/CORE_BANKING.md)** - CBS module documentation
- **[Member Management](./features/MEMBER_MANAGEMENT.md)** - Member module
- **[Loan Management](./features/LOAN_MANAGEMENT.md)** - Loan processing
- **[Accounting](./features/ACCOUNTING.md)** - Accounting and GL
- **[HRM](./features/HRM.md)** - Human Resource Management
- **[Darta Chalani](./features/DARTA_CHALANI.md)** - Document management system

### 🛠️ Development

- **[Contributing Guide](./development/CONTRIBUTING.md)** - How to contribute
- **[Code Style Guide](./development/CODE_STYLE.md)** - Coding standards
- **[Git Workflow](./development/GIT_WORKFLOW.md)** - Branching and PR process
- **[Troubleshooting](./development/TROUBLESHOOTING.md)** - Common issues and solutions

### 📊 Project Management

- **[Roadmap](./planning/ROADMAP.md)** - Project roadmap and milestones
- **[Next Steps](./planning/NEXT_STEPS_ROADMAP.md)** - Upcoming tasks
- **[Status Reports](./reports/STATUS_REPORTS.md)** - Project status updates

### 📖 Reference

- **[API Reference](./reference/API_REFERENCE.md)** - Complete API documentation
- **[Database Reference](./reference/DATABASE_REFERENCE.md)** - Database tables and fields
- **[Environment Variables](./reference/ENVIRONMENT_VARIABLES.md)** - Configuration options
- **[Glossary](./reference/GLOSSARY.md)** - Terms and definitions

## 📁 Documentation Structure

```
docs/
├── README.md (this file)
├── setup/                    # Getting started guides
├── deployment/               # Deployment and CI/CD
├── architecture/             # System design
├── security/                 # Security and RBAC
├── testing/                  # Testing guides
├── features/                 # Feature documentation
├── development/              # Development guides
├── planning/                 # Roadmaps and planning
├── reports/                  # Status reports
├── reference/                # Technical reference
└── archive/                  # Archived documentation
```

## 🔍 Finding What You Need

### I want to...

- **Start developing** → [Quick Start](./setup/QUICK_START.md)
- **Deploy to production** → [Docker Deployment](./deployment/DOCKER_DEPLOYMENT.md)
- **Understand the architecture** → [Architecture](./architecture/ARCHITECTURE.md)
- **Write tests** → [Testing Guide](./testing/TESTING_GUIDE.md)
- **Contribute code** → [Contributing Guide](./development/CONTRIBUTING.md)
- **Check project status** → [Roadmap](./planning/ROADMAP.md)
- **Fix an issue** → [Troubleshooting](./development/TROUBLESHOOTING.md)

## 📝 Documentation Guidelines

### For Contributors

When adding new documentation:

1. Place it in the appropriate subdirectory
2. Use clear, descriptive filenames
3. Add a link to this README
4. Follow the [Documentation Style Guide](./development/DOCUMENTATION_STYLE.md)
5. Keep it up to date

### For Maintainers

- Review documentation in PRs
- Archive outdated docs to `archive/`
- Update this README when structure changes
- Ensure all links work

## 🆘 Need Help?

- **Questions?** Check [Troubleshooting](./development/TROUBLESHOOTING.md)
- **Bug reports?** Open an issue on GitHub
- **Feature requests?** Check the [Roadmap](./planning/ROADMAP.md) first
- **Contributing?** Read [Contributing Guide](./development/CONTRIBUTING.md)

## 📅 Last Updated

**Date:** 2025-12-07  
**Version:** 1.0.0  
**Status:** ✅ Active

---

**Note:** This documentation is continuously updated. If you find any issues or have suggestions, please open an issue or submit a PR.
