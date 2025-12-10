# Security Policy

## Supported Versions

I actively support and provide security updates for the following versions:

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

I recommend always using the latest version to ensure you have the most recent security patches.

## Reporting a Vulnerability

I take the security of MyERP very seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. **Do NOT** disclose the vulnerability publicly until I've had a chance to address it
3. Send an email to: **prembhandari06@gmail.com**
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

1. **Acknowledgment**: You'll receive confirmation that I've received your report
2. **Investigation**: I will investigate the issue
3. **Updates**: I'll keep you informed of my progress
4. **Resolution**: Once fixed, I'll notify you and may request your verification
5. **Credit**: With your permission, I'll credit you in my security advisories

### Security Best Practices

When reporting vulnerabilities, please:

- Act in good faith and avoid accessing or modifying data that doesn't belong to you
- Do not perform any actions that could harm my users or systems
- Do not violate any laws or breach any agreements
- Keep the vulnerability details confidential until I've resolved it

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

Security updates are released as needed. I recommend:

- Subscribing to security advisories (if available)
- Regularly updating dependencies: `pnpm update`
- Running security audits: `pnpm audit`
- Monitoring the repository for security-related commits

## Responsible Disclosure

I follow responsible disclosure practices:

1. I will not take legal action against security researchers who:
   - Act in good faith
   - Do not access or modify data without authorization
   - Do not cause harm to my systems or users
   - Report vulnerabilities promptly

2. I ask that you:
   - Give me reasonable time to fix the issue before public disclosure
   - Not exploit the vulnerability beyond what's necessary to demonstrate it
   - Not share the vulnerability with others until it's resolved

## Security Contact

For security-related inquiries, please contact:

- **Email**: prembhandari06@gmail.com
- **GitHub Security Advisories**:

## Additional Resources

- [Security Documentation](./docs/security/)
- [RBAC Documentation](./docs/security/RBAC.md)
- [Security Enhancements](./apps/backend/SECURITY_ENHANCEMENTS.md)
- [Security Middleware Guide](./apps/backend/SECURITY_MIDDLEWARE_IMPLEMENTATION.md)

---

**Thank you for helping keep MyERP secure!**
