# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

We recommend always using the latest version to ensure you have the most recent security patches.

## Reporting a Vulnerability

We take the security of MyERP very seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. **Do NOT** disclose the vulnerability publicly until we've had a chance to address it
3. Send an email to: **security@myerp.com** (or your security contact email)
   - Include a detailed description of the vulnerability
   - Provide steps to reproduce the issue
   - Include any proof-of-concept code or screenshots (if applicable)
   - Specify the affected version(s)

### What to Include in Your Report

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Affected component** (backend, frontend, mobile app, database schema)
- **Severity assessment** (if possible)
- **Potential impact** (data exposure, privilege escalation, etc.)
- **Suggested fix** (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 7 days with an assessment and next steps
- **Resolution**: Depends on severity:
  - **Critical**: Immediate attention, patch within 24-72 hours
  - **High**: Patch within 1 week
  - **Medium**: Patch within 2-4 weeks
  - **Low**: Patch in next scheduled release

### What to Expect

1. **Acknowledgment**: You'll receive confirmation that we've received your report
2. **Investigation**: Our security team will investigate the issue
3. **Updates**: We'll keep you informed of our progress
4. **Resolution**: Once fixed, we'll notify you and may request your verification
5. **Credit**: With your permission, we'll credit you in our security advisories

### Security Best Practices

When reporting vulnerabilities, please:

- Act in good faith and avoid accessing or modifying data that doesn't belong to you
- Do not perform any actions that could harm our users or systems
- Do not violate any laws or breach any agreements
- Keep the vulnerability details confidential until we've resolved it

## Security Features

MyERP includes several built-in security features:

- **Authentication & Authorization**: JWT-based authentication with role-based access control (RBAC)
- **Input Validation**: Comprehensive validation middleware for all API endpoints
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Content Security Policy and input sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Secure HTTP headers configured
- **Dependency Scanning**: Automated security audits via GitHub Actions
- **Code Scanning**: CodeQL analysis for security vulnerabilities

## Security Updates

Security updates are released as needed. We recommend:

- Subscribing to security advisories (if available)
- Regularly updating dependencies: `pnpm update`
- Running security audits: `pnpm audit`
- Monitoring the repository for security-related commits

## Responsible Disclosure

We follow responsible disclosure practices:

1. We will not take legal action against security researchers who:
   - Act in good faith
   - Do not access or modify data without authorization
   - Do not cause harm to our systems or users
   - Report vulnerabilities promptly

2. We ask that you:
   - Give us reasonable time to fix the issue before public disclosure
   - Not exploit the vulnerability beyond what's necessary to demonstrate it
   - Not share the vulnerability with others until it's resolved

## Security Contact

For security-related inquiries, please contact:

- **Email**: prembhandari06@gmail.com.com
- **GitHub Security Advisories**: Use GitHub's private vulnerability reporting feature if enabled

## Additional Resources

- [Security Documentation](./docs/security/)
- [RBAC Documentation](./docs/security/RBAC.md)
- [Security Enhancements](./apps/backend/SECURITY_ENHANCEMENTS.md)
- [Security Middleware Guide](./apps/backend/SECURITY_MIDDLEWARE_IMPLEMENTATION.md)

---

**Thank you for helping keep MyERP secure!**
