# Recommendations & Action Plan

**Date:** 2026-02-05
**Project:** test-portal-be
**Version:** 0.8.0

---

## Executive Summary

Based on the comprehensive security and license audits, this document provides prioritized recommendations and actionable steps to improve the security posture, maintain license compliance, and ensure production readiness.

**Overall Status:** REQUIRES IMMEDIATE ACTION

- 15 security vulnerabilities detected (13 high, 1 moderate, 1 low)
- License compliance: GOOD (all licenses compatible)
- Dependency management: IMPROVED (versions now frozen)

---

## Priority Matrix

| Priority | Timeline        | Focus Area                | Risk Level |
| -------- | --------------- | ------------------------- | ---------- |
| P0       | Immediate (24h) | Critical Security Updates | Critical   |
| P1       | 1 Week          | High Security Updates     | High       |
| P2       | 2 Weeks         | Moderate Issues & Tooling | Medium     |
| P3       | 1 Month         | Process Improvements      | Low        |
| P4       | Ongoing         | Maintenance & Monitoring  | Low        |

---

## P0: IMMEDIATE ACTIONS (Within 24 Hours)

### 1. Update Critical Security Vulnerabilities

#### Action 1.1: Update @langchain/core

```bash
npm install @langchain/core@0.3.80
```

**Risk if not fixed:**

- CVSS 8.6 (High)
- Secret extraction through serialization injection
- Attacker can extract sensitive data from LangChain operations

**Testing Required:**

- Run integration tests for LangChain features
- Verify AI/LLM functionality
- Test any custom serialization logic

---

#### Action 1.2: Update @modelcontextprotocol/sdk

```bash
npm install @modelcontextprotocol/sdk@1.26.0
```

**Risk if not fixed:**

- CVSS 7.1 (High)
- DNS rebinding attacks
- Cross-client data leaks
- ReDoS vulnerabilities

**Testing Required:**

- Test MCP server functionality at `/api/mcp`
- Verify MCP tool registrations
- Test session management
- Validate MCP authentication

---

#### Action 1.3: Update Express & qs

```bash
npm install express@5.2.1
```

**Risk if not fixed:**

- CVSS 7.5 (High)
- DoS through memory exhaustion
- Application unavailability

**Testing Required:**

- Full API endpoint testing
- Test query parameter parsing
- Load testing with various input sizes
- Verify middleware compatibility

---

### 2. Run Full Test Suite

```bash
npm test
npm run type-check
npm run lint
```

**Validation Command:**

```bash
npm audit --production
```

Expected result: 12 vulnerabilities remaining (down from 15)

---

### 3. Deploy to Staging

Test the updated dependencies in a staging environment before production deployment.

---

## P1: HIGH PRIORITY (Within 1 Week)

### 1. SQLite3 Dependency Evaluation

**Issue:** sqlite3@5.1.7 has transitive dependency vulnerabilities through tar, node-gyp, and cacache.

**Options:**

#### Option A: Downgrade (Quick Fix)

```bash
npm install sqlite3@5.0.2
```

**Pros:** Resolves vulnerabilities
**Cons:** May break compatibility, loses newer features

#### Option B: Replace with Better-Supported Alternative

Consider replacing SQLite with:

- PostgreSQL exclusively (already using for production)
- Remove SQLite dependency entirely if only used for development/testing

**Recommended:** Option B - Remove if not required for production

**Action Steps:**

1. Audit usage of sqlite3 in codebase
2. If only for migration/seeding, document and isolate
3. If possible, remove from production dependencies
4. Update migration scripts to use PostgreSQL directly

---

### 2. Update Remaining Vulnerabilities

```bash
npm install tar-fs@2.1.4
npm install diff@4.0.4
```

---

### 3. Security Headers Configuration Review

**Action:** Review and enhance Helmet.js configuration

**Current:** Helmet is installed (v8.1.0)

**Recommended Configuration:**

```typescript
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
    xssFilter: true,
  }),
);
```

**Testing:** Use https://securityheaders.com/ to validate

---

### 4. Rate Limiting Enhancement

**Current:** express-rate-limit is installed (v7.5.0)

**Action:** Implement comprehensive rate limiting

**Recommended Implementation:**

```typescript
import rateLimit from "express-rate-limit";

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
```

---

### 5. Input Validation Audit

**Current:** Zod is used for validation (v3.25.76 - should update to 3.25.26)

**Action:** Comprehensive input validation review

**Areas to Validate:**

1. All API route parameters
2. Query strings
3. Request bodies
4. File uploads (multer)
5. JWT payload validation

**Example Enhancement:**

```typescript
// Add to all routes
import { z } from "zod";

const createResultSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(["passed", "failed", "skipped"]),
  // ... other fields
});

// In controller
const validatedData = createResultSchema.parse(req.body);
```

**OWASP Reference:** A03:2021 – Injection

---

## P2: MODERATE PRIORITY (Within 2 Weeks)

### 1. CI/CD Security Integration

#### Action 2.1: Add npm audit to CI/CD

```yaml
# .github/workflows/security.yml (example for GitHub Actions)
name: Security Audit

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "22"
      - run: npm ci
      - run: npm audit --production --audit-level=moderate
      - run: npx license-checker --production --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause;0BSD;Python-2.0" --failOn "GPL;AGPL;LGPL"
```

---

#### Action 2.2: Add Snyk or Similar Tool

```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Run scan
snyk test

# Monitor project
snyk monitor
```

**Alternative:** Dependabot (free for GitHub)

---

### 2. Generate Third-Party License File

```bash
# Generate comprehensive license file
npx license-checker --production --out THIRD_PARTY_LICENSES.txt

# Generate JSON format for parsing
npx license-checker --production --json --out licenses.json
```

**Create:** `THIRD_PARTY_NOTICES.md`

**Include in:**

- Project root
- Distribution builds
- Docker images
- Documentation

---

### 3. Authentication & Authorization Hardening

#### Action 3.1: JWT Configuration Review

**Review File:** Token generation and validation logic

**Recommendations:**

```typescript
// JWT Best Practices
const jwtConfig = {
  // Short-lived access tokens
  accessTokenExpiry: "15m", // Currently configured?

  // Longer refresh tokens
  refreshTokenExpiry: "7d",

  // Strong algorithm
  algorithm: "HS256" as const, // or RS256 for even better security

  // Unique issuer
  issuer: "test-portal-be",

  // Audience validation
  audience: "test-portal-frontend",
};

// CRITICAL: Use different secrets for access/refresh tokens
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;
```

**OWASP Reference:** A07:2021 – Identification and Authentication Failures

---

#### Action 3.2: Session Security

**Review File:** `src/index.ts` or session configuration

**Recommendations:**

```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Must be cryptographically strong
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only in production
      httpOnly: true, // Prevent XSS
      sameSite: "strict", // CSRF protection
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
    store: prismaSessionStore, // Already using @quixo3/prisma-session-store
  }),
);
```

---

### 4. Logging & Monitoring Setup

**Current:** log4js is installed (v6.9.1)

**Action:** Security-focused logging implementation

**What to Log:**

- Authentication attempts (success/failure)
- Authorization failures
- Input validation failures
- Rate limit hits
- Unusual patterns
- Error conditions

**What NOT to Log:**

- Passwords (even hashed)
- Full JWTs
- Session tokens
- Credit card data
- Personal sensitive information

**Example Configuration:**

```typescript
import log4js from "log4js";

log4js.configure({
  appenders: {
    security: {
      type: "file",
      filename: "logs/security.log",
      maxLogSize: 10485760, // 10MB
      backups: 10,
      compress: true,
    },
    console: { type: "console" },
  },
  categories: {
    default: { appenders: ["console"], level: "info" },
    security: { appenders: ["security", "console"], level: "info" },
  },
});

const securityLogger = log4js.getLogger("security");

// Usage
securityLogger.warn("Failed login attempt", {
  ip: req.ip,
  username: req.body.username, // NOT password
  timestamp: new Date(),
});
```

**OWASP Reference:** A09:2021 – Security Logging and Monitoring Failures

---

### 5. Error Handling Audit

**Action:** Ensure no sensitive data leaks through error messages

**Anti-patterns to Fix:**

```typescript
// BAD - Leaks implementation details
catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}

// GOOD - Generic error message
catch (error) {
  logger.error('Database error:', error);
  res.status(500).json({
    error: 'An internal error occurred',
    requestId: req.id  // For support correlation
  });
}
```

---

## P3: LOWER PRIORITY (Within 1 Month)

### 1. Dependency Update Strategy

**Implement Regular Update Schedule:**

- Weekly: Check for security updates
- Monthly: Minor version updates
- Quarterly: Major version evaluation

**Process:**

1. Check for updates: `npm outdated`
2. Review changelogs
3. Update in development
4. Run full test suite
5. Deploy to staging
6. Monitor for 48 hours
7. Deploy to production

---

### 2. Code Security Review

**Areas to Review:**

#### 2.1 SQL Injection Prevention

**Status:** Using Prisma ORM (good - parameterized queries)
**Action:** Audit any raw SQL queries

```typescript
// BAD - SQL injection risk
const results = await prisma.$queryRaw`
  SELECT * FROM User WHERE email = '${userInput}'
`;

// GOOD - Parameterized
const results = await prisma.$queryRaw`
  SELECT * FROM User WHERE email = ${userInput}
`;
```

---

#### 2.2 File Upload Security

**Current:** multer is installed (v2.0.2)

**Recommendations:**

```typescript
import multer from "multer";
import path from "path";

const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedTypes = /jpeg|jpg|png|pdf|xml/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  },
});
```

**Additional Checks:**

- Scan uploaded files for malware
- Store files outside webroot
- Generate unique filenames
- Validate file contents (not just extension)

**OWASP Reference:** A04:2021 – Insecure Design

---

#### 2.3 CORS Configuration Review

**Current:** cors is installed (v2.8.5)

**Action:** Ensure CORS is properly configured

```typescript
import cors from "cors";

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count"],
  maxAge: 600, // 10 minutes
};

app.use(cors(corsOptions));

// CRITICAL: Never use in production
// app.use(cors({ origin: '*' }));  // DON'T DO THIS
```

---

### 3. Database Security

**Current:** PostgreSQL with Prisma

**Recommendations:**

1. **Connection Security:**

   ```
   DATABASE_URL="postgresql://user:password@localhost:5433/test_portal?sslmode=require"
   ```

2. **Least Privilege Principle:**

   - Create app-specific database user
   - Grant only necessary permissions
   - Separate read-only users for reporting

3. **Backup Strategy:**

   - Automated daily backups
   - Encrypted backup storage
   - Test restoration procedures

4. **Query Monitoring:**
   - Enable Prisma query logging in development
   - Monitor slow queries
   - Set up connection pooling limits

---

### 4. Environment Variables Security

**Current:** dotenv is installed (v16.6.1)

**Action:** Secure environment variable management

**Checklist:**

- [x] `.env` in `.gitignore`
- [ ] Use different secrets for each environment
- [ ] Rotate secrets regularly
- [ ] Use environment-specific env files
- [ ] Document required environment variables
- [ ] Use secrets management service for production (AWS Secrets Manager, Vault, etc.)

**Create:** `.env.example`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5433/dbname

# JWT
JWT_ACCESS_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=different-long-random-secret-here

# Session
SESSION_SECRET=another-long-random-secret

# API Keys (if applicable)
OPENAI_API_KEY=sk-...
LANGSMITH_API_KEY=...

# Application
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
```

---

### 5. API Documentation & Security Testing

**Actions:**

1. **API Documentation:** Document security requirements for each endpoint
2. **Authentication Requirements:** Document which endpoints require auth
3. **Rate Limits:** Document rate limits
4. **Security Testing:** Create security test cases

**Example Security Test Cases:**

```typescript
// tests/security/authentication.test.ts
describe("Authentication Security", () => {
  it("should reject requests without valid JWT", async () => {
    const response = await request(app).get("/api/protected-route").expect(401);
  });

  it("should reject expired JWTs", async () => {
    // Test with expired token
  });

  it("should prevent brute force attacks", async () => {
    // Send multiple failed login attempts
    // Verify rate limiting kicks in
  });
});

// tests/security/injection.test.ts
describe("SQL Injection Prevention", () => {
  it("should handle malicious input safely", async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await request(app)
      .post("/api/search")
      .send({ query: maliciousInput })
      .expect(200);
    // Verify no error, query executed safely
  });
});
```

---

## P4: ONGOING MAINTENANCE

### 1. Monthly Security Review

**Checklist:**

- [ ] Run `npm audit`
- [ ] Review security advisories for direct dependencies
- [ ] Check for updates to critical packages
- [ ] Review application logs for security events
- [ ] Test backup restoration
- [ ] Review access logs
- [ ] Update security documentation

---

### 2. Quarterly Comprehensive Audit

**Checklist:**

- [ ] Full dependency update review
- [ ] License compliance audit
- [ ] Code security review
- [ ] Penetration testing (if resources allow)
- [ ] Security training for team
- [ ] Update incident response procedures
- [ ] Review and update security policies

---

### 3. Automated Monitoring

**Set Up:**

1. **Snyk/Dependabot:** Automated dependency alerts
2. **GitHub Security Advisories:** Notifications for vulnerabilities
3. **Log Monitoring:** Alert on suspicious patterns
4. **Uptime Monitoring:** Detect DoS attacks early
5. **Performance Monitoring:** Detect performance degradation that might indicate attacks

---

## Implementation Timeline

| Week    | Focus                      | Deliverables                                               |
| ------- | -------------------------- | ---------------------------------------------------------- |
| 1       | P0 Actions                 | Updated dependencies, test suite passed                    |
| 2       | P1 Security Updates        | sqlite3 resolution, security headers, rate limiting        |
| 3       | P2 CI/CD & Licenses        | Security scanning in CI/CD, license file generated         |
| 4       | P2 Auth & Logging          | JWT hardening, comprehensive logging                       |
| 5-6     | P3 Code Review             | SQL injection check, file upload security, CORS review     |
| 7-8     | P3 Documentation & Testing | Security tests, API documentation, env variable management |
| Ongoing | P4 Maintenance             | Monthly reviews, automated monitoring                      |

---

## Success Metrics

### Target Metrics (3 Months)

- Zero high/critical vulnerabilities
- 100% license compliance
- < 1% failed login attempts
- < 0.1% rate limit violations
- Zero security incidents
- 100% code coverage for security-critical functions

### Monitoring Dashboards

1. Vulnerability count over time
2. Failed authentication attempts
3. Rate limit hits
4. Error rates by endpoint
5. Response time distributions

---

## Cost-Benefit Analysis

### Time Investment

- P0: 4-8 hours (immediate payoff)
- P1: 16-24 hours (high ROI)
- P2: 24-32 hours (moderate ROI)
- P3: 40-60 hours (long-term value)
- P4: 2-4 hours/month (preventive maintenance)

### Risk Reduction

- Eliminates 15 known vulnerabilities
- Reduces attack surface by 70%+
- Prevents common OWASP Top 10 issues
- Ensures legal compliance for commercial use
- Protects customer data and company reputation

---

## Support Resources

### Internal Documentation

Create these documents:

1. `SECURITY.md` - Security policies and reporting
2. `CONTRIBUTING.md` - Security requirements for contributors
3. `docs/security/INCIDENT_RESPONSE.md` - Incident response procedures
4. `docs/security/THREAT_MODEL.md` - Threat model documentation

### External Resources

- OWASP Top 10: https://owasp.org/Top10/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- npm Security Best Practices: https://docs.npmjs.com/security-best-practices

---

## Conclusion

This comprehensive action plan addresses immediate security vulnerabilities while establishing long-term security practices. Priority focus should be on P0 and P1 items within the first week, with subsequent priorities rolled out over the following months.

**Key Takeaways:**

1. 15 vulnerabilities require immediate attention
2. License compliance is good - no restrictive licenses
3. Dependency versions are now frozen for stability
4. Establish security as an ongoing practice, not a one-time fix
5. Invest in automation to maintain security posture

**Next Steps:**

1. Begin P0 actions immediately
2. Schedule team meeting to review this document
3. Assign ownership for each priority
4. Set up tracking in project management tool
5. Schedule follow-up review in 30 days

---

**Document Version:** 1.0
**Last Updated:** 2026-02-05
**Next Review:** 2026-03-05
