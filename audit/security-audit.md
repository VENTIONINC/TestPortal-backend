# Security Audit Report

**Date:** 2026-02-05
**Project:** test-portal-be
**Version:** 0.8.0

## Executive Summary

This security audit was performed to identify vulnerabilities in the project's dependencies. The audit revealed **15 vulnerabilities** across 13 high severity and 1 moderate severity issues.

### Vulnerability Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 0      |
| High      | 13     |
| Moderate  | 1      |
| Low       | 1      |
| **Total** | **15** |

### Total Dependencies

- Production: 364 packages
- Development: 477 packages
- Optional: 60 packages
- **Total:** 899 packages

## Critical & High Severity Vulnerabilities

### 1. @langchain/core - Serialization Injection (HIGH)

**CVE:** GHSA-r399-636x-v7f6
**Current Version:** 0.3.78
**Fixed Version:** 0.3.80
**CVSS Score:** 8.6 (High)
**CWE:** CWE-502 (Deserialization of Untrusted Data)

**Description:**
LangChain serialization injection vulnerability enables secret extraction. This allows attackers to exploit deserialization to extract sensitive information.

**Impact:**

- Confidentiality: HIGH
- Integrity: NONE
- Availability: NONE

**Fix Available:** Yes (version 0.3.80)

**OWASP Reference:** [A08:2021 – Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)

---

### 2. @modelcontextprotocol/sdk - Multiple Vulnerabilities (HIGH)

**Current Version:** 1.17.1
**Fixed Version:** 1.26.0

#### 2a. DNS Rebinding Protection Not Enabled by Default

**CVE:** GHSA-w48q-cv73-mx4w
**CWE:** CWE-350 (Reliance on Reverse DNS Resolution), CWE-1188

**Description:**
MCP TypeScript SDK does not enable DNS rebinding protection by default, allowing attackers to bypass same-origin policies.

#### 2b. ReDoS Vulnerability

**CVE:** GHSA-8r9q-7v3j-jr4g
**CWE:** CWE-1333 (Regular Expression Denial of Service)

**Description:**
Regular expression vulnerability can cause denial of service through excessive backtracking.

#### 2c. Cross-Client Data Leak

**CVE:** GHSA-345p-7cg4-v4c7
**CVSS Score:** 7.1 (High)
**CWE:** CWE-362 (Race Condition)

**Description:**
Shared server/transport instance reuse can leak data between clients due to race conditions.

**Impact:**

- Confidentiality: HIGH
- Integrity: LOW
- Availability: NONE

**Fix Available:** Yes (version 1.26.0)

**OWASP Reference:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

### 3. express & qs - DoS via Memory Exhaustion (HIGH)

**Affected Packages:** express (5.0.1), body-parser, qs
**CVE:** GHSA-6rw7-vpxm-498p
**CVSS Score:** 7.5 (High)
**CWE:** CWE-20 (Improper Input Validation)

**Description:**
The `qs` library's arrayLimit can be bypassed in bracket notation, allowing attackers to cause denial of service through memory exhaustion.

**Current Version:** qs < 6.14.1
**Fixed Version:** express 5.2.1 (includes qs >= 6.14.1)

**Impact:**

- Availability: HIGH

**Fix Available:** Yes (express 5.2.1)

**OWASP Reference:** [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

---

### 4. sqlite3, node-gyp, tar - Multiple Path Traversal Vulnerabilities (HIGH)

**Current Version:** sqlite3 5.1.7
**Fixed Version:** 5.0.2 (major version downgrade required)

#### 4a. tar - Arbitrary File Overwrite via Path Traversal

**CVE:** GHSA-8qq5-rm4j-mr97, GHSA-34x7-hfp2-rc4v
**CVSS Score:** 8.2 (High)
**CWE:** CWE-22 (Path Traversal), CWE-59

**Description:**
Multiple path sanitization vulnerabilities in tar package allow arbitrary file creation/overwrite through:

- Insufficient path sanitization (tar <= 7.5.2)
- Hardlink path traversal (tar < 7.5.7)

#### 4b. tar - Race Condition on macOS APFS

**CVE:** GHSA-r6q2-hw4h-h46w
**CVSS Score:** 8.8 (High)
**CWE:** CWE-176 (Unicode Ligature Collisions)

**Description:**
Race condition in path reservations via Unicode ligature collisions on macOS APFS filesystem.

**Impact:**

- Confidentiality: LOW
- Integrity: HIGH
- Availability: LOW

**Fix Available:** Yes, but requires major version change to sqlite3 5.0.2

**OWASP Reference:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

---

### 5. tar-fs - Symlink Validation Bypass (HIGH)

**CVE:** GHSA-vj76-c3g6-qr5v
**Current Version:** 2.0.0 - 2.1.3
**Fixed Version:** 2.1.4
**CWE:** CWE-22 (Path Traversal), CWE-61

**Description:**
Symlink validation can be bypassed if destination directory is predictable with a specific tarball structure.

**Fix Available:** Yes (version 2.1.4)

---

### 6. js-yaml - Prototype Pollution (MODERATE)

**Fixed Version:** Available

**OWASP Reference:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

---

### 7. diff - Denial of Service (LOW)

**CVE:** GHSA-73rr-hh4g-fpgx
**Current Version:** 4.0.0 - 4.0.3
**Fixed Version:** 4.0.4
**CWE:** CWE-400 (Resource Exhaustion), CWE-1333 (ReDoS)

**Description:**
DoS vulnerability in parsePatch and applyPatch functions through regular expression backtracking.

**Fix Available:** Yes (version 4.0.4)

---

## Indirect Dependencies

The following vulnerabilities affect transitive dependencies:

- **cacache** (via tar): Versions 14.0.0 - 18.0.4
- **make-fetch-happen** (via cacache): Versions <= 14.0.0
- **node-gyp** (via make-fetch-happen, tar): Versions <= 10.3.1

These indirect dependencies are pulled in by `sqlite3@5.1.7`.

---

## Security Best Practices Review

### Current Implementation

The codebase includes several security measures:

- Helmet.js for security headers
- JWT authentication with refresh tokens
- Argon2 for password hashing
- CORS configuration
- Express session management

### Areas of Improvement

1. **Input Validation**

   - Implement comprehensive input validation using Zod schemas (partially implemented)
   - Add rate limiting to all API endpoints (express-rate-limit is installed)

2. **Dependency Management**

   - Update vulnerable dependencies immediately
   - Implement automated dependency scanning in CI/CD
   - Set up Dependabot or similar tools for automatic updates

3. **Authentication & Authorization**

   - Review JWT token expiration times
   - Implement proper session invalidation
   - Add CSRF protection for state-changing operations

4. **Error Handling**
   - Ensure errors don't leak sensitive information
   - Implement proper logging without exposing stack traces to clients

---

## Immediate Actions Required

### Priority 1 (Critical - Update Immediately)

1. Update `@langchain/core` from 0.3.78 to 0.3.80
2. Update `@modelcontextprotocol/sdk` from 1.17.1 to 1.26.0
3. Update `express` from 5.0.1 to 5.2.1

### Priority 2 (High - Update Within 7 Days)

1. Evaluate sqlite3 usage - consider downgrading to 5.0.2 or finding alternatives
2. Update `tar-fs` to 2.1.4
3. Update `diff` to 4.0.4

### Priority 3 (Moderate - Review and Plan)

1. Review all dependencies for latest security patches
2. Implement automated security scanning in CI/CD pipeline
3. Set up a dependency update schedule

---

## Testing Recommendations

After applying security updates, perform the following tests:

1. **Unit Tests:** Run full test suite
2. **Integration Tests:** Test API endpoints with various input scenarios
3. **Security Tests:**

   - Test authentication/authorization flows
   - Attempt SQL injection on all input fields
   - Test rate limiting functionality
   - Verify CORS configuration
   - Check security headers with tools like SecurityHeaders.com

4. **Performance Tests:** Ensure updates don't degrade performance

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [npm Security Advisories](https://www.npmjs.com/advisories)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [CVE Database](https://cve.mitre.org/)

---

## Audit Metadata

**Audit Tool:** npm audit v10
**Auditor:** Automated Security Analysis
**Next Review Date:** 2026-03-05 (30 days)
**Dependencies Frozen:** Yes (all versions pinned)
