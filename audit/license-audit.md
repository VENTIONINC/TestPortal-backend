# License Audit Report

**Date:** 2026-02-05
**Project:** test-portal-be
**Version:** 0.8.0
**Total Dependencies Audited:** 364 production dependencies

---

## Executive Summary

This license audit was performed to ensure compliance with commercial use requirements and identify any restrictive or incompatible licenses. The audit examined 364 production dependencies.

### License Distribution Summary

| License Type | Count | Commercial Use | Attribution Required |
| ------------ | ----- | -------------- | -------------------- |
| MIT          | ~285  | Yes            | Yes                  |
| ISC          | ~45   | Yes            | Yes                  |
| Apache-2.0   | ~25   | Yes            | Yes                  |
| BSD-3-Clause | ~6    | Yes            | Yes                  |
| BSD-2-Clause | ~3    | Yes            | Yes                  |
| 0BSD         | 2     | Yes            | No                   |
| Python-2.0   | 1     | Yes            | Yes                  |
| Other/Dual   | ~2    | Review         | Varies               |

### Risk Assessment

**Overall Risk Level:** LOW

- No GPL, AGPL, or other copyleft licenses detected
- All licenses are permissive and commercially compatible
- Attribution requirements are standard and manageable

---

## License Categories

### 1. Highly Permissive Licenses (Safe for Commercial Use)

#### MIT License (~285 packages)

**Commercial Use:** Fully Permitted
**Modification:** Permitted
**Distribution:** Permitted
**Patent Grant:** No explicit grant
**Attribution Required:** Yes

**Notable Packages:**

- `express`, `express-session`, `express-rate-limit`
- `@langchain/core`, `@langchain/openai`, `langchain`
- `@modelcontextprotocol/sdk`
- `jsonwebtoken`, `argon2`
- `zod`, `helmet`
- `multer`, `cors`, `cookie-parser`
- `typescript`, `nodemon`, `prettier`
- `openai`, `langsmith`

**Compliance Requirements:**

- Include MIT license text in distribution/documentation
- Preserve copyright notices

---

#### ISC License (~45 packages)

**Commercial Use:** Fully Permitted
**Virtually identical to MIT, functionally equivalent**

**Notable Packages:**

- `graceful-fs`, `glob`, `minimatch`
- `npmlog`, `semver`
- Various npm utility packages

**Compliance Requirements:**

- Include ISC license text
- Preserve copyright notices

---

#### Apache License 2.0 (~25 packages)

**Commercial Use:** Fully Permitted
**Modification:** Permitted
**Distribution:** Permitted
**Patent Grant:** Yes (explicit)
**Trademark:** Restricted

**Notable Packages:**

- `@prisma/client`, `prisma` (version 6.19.2)
- `amazon-cognito-identity-js`
- `@aws-crypto/*` packages
- `@aws-sdk/types`
- `detect-libc`, `tunnel-agent`
- `ecdsa-sig-formatter`
- `log4js`
- `openai`

**Compliance Requirements:**

- Include Apache 2.0 license text
- Include NOTICE file if present
- State significant modifications
- Preserve patent grant

**Patent Protection:**
This is a key advantage - Apache 2.0 provides explicit patent protection.

---

#### BSD Licenses (3-Clause & 2-Clause) (~9 packages)

**Commercial Use:** Fully Permitted
**Modification:** Permitted
**Distribution:** Permitted

**BSD-3-Clause Packages:**

- `sqlite3` - BSD-3-Clause
- `buffer-equal-constant-time`
- `deepmerge-ts`
- `ieee754`
- `qs`
- `sprintf-js`

**BSD-2-Clause Packages:**

- `dotenv`
- `http-cache-semantics`
- `uri-js`
- `webidl-conversions`

**Compliance Requirements:**

- Include BSD license text
- Preserve copyright notices
- BSD-3-Clause: Cannot use organization name for endorsement

---

#### 0BSD (Zero-Clause BSD) (2 packages)

**Commercial Use:** Fully Permitted
**Attribution Required:** No

**Packages:**

- `tslib` (versions 1.14.1 and 2.8.1)

**Notes:**
Most permissive license - effectively public domain with liability disclaimer.

---

### 2. Other Compatible Licenses

#### Python-2.0 License (1 package)

**Package:** `argparse`
**Commercial Use:** Yes
**Compatibility:** GPL-compatible, permissive

**Compliance Requirements:**

- Include license text
- Preserve copyright notices

---

#### Dual/Multi-Licensed (2-3 packages)

**rc@1.2.8**
`(BSD-2-Clause OR MIT OR Apache-2.0)`
Can choose any of the three - all are commercially compatible.

**type-fest@2.19.0**
`(MIT OR CC0-1.0)`
Can choose MIT or public domain (CC0) - both commercially compatible.

**expand-template@2.0.3**
`(MIT OR WTFPL)`
Can choose MIT or WTFPL - both permissive.

---

## Restrictive or Problematic Licenses

### None Detected

**No GPL, LGPL, AGPL, or other copyleft licenses found.**

This is excellent for commercial use as there are no viral/copyleft requirements that would force your code to be open-sourced.

---

## Special Considerations

### 1. Prisma License Review

**Packages:** `@prisma/client`, `prisma`
**License:** Apache-2.0

Prisma uses Apache 2.0, which is fully compatible with commercial use. However, note:

- Prisma itself is open source
- Full commercial use permitted
- Patent grant included
- No additional restrictions

---

### 2. LangChain Packages

**Packages:** `@langchain/core`, `@langchain/openai`, `langchain`
**License:** MIT

All LangChain packages use MIT license - fully commercial compatible.

---

### 3. AWS SDK Components

**Packages:** Various `@aws-*` packages, `amazon-cognito-identity-js`
**License:** Apache-2.0

All AWS SDK components use Apache 2.0 - fully compatible with commercial use.

---

### 4. OpenAI SDK

**Package:** `openai`
**License:** Apache-2.0

Official OpenAI Node.js SDK - commercially compatible. Note this is the client library license, separate from OpenAI API terms of service.

---

## Attribution Requirements

For commercial distribution, you must:

1. **Include License Texts**

   - Provide a file (e.g., `THIRD_PARTY_LICENSES.md`) containing all license texts
   - Can bundle similar licenses (e.g., all MIT licenses together)

2. **Preserve Copyright Notices**

   - Include copyright statements from dependencies
   - Can be in same file as license texts

3. **NOTICE Files (Apache 2.0 only)**

   - Include NOTICE files from packages that have them
   - Examples: `amazon-cognito-identity-js` has NOTICE.txt

4. **Recommended Format**

   ```
   This software includes the following third-party packages:

   [Package Name] - [License]
   Copyright [Year] [Copyright Holder]
   [License Full Text]

   ---
   ```

---

## License Compliance Checklist

- [x] All dependencies use commercially compatible licenses
- [x] No GPL/AGPL/copyleft licenses present
- [ ] Generate THIRD_PARTY_LICENSES.md file
- [ ] Include in distribution/build artifacts
- [ ] Update on dependency changes
- [ ] Review license changes on updates
- [ ] Document license compliance in README

---

## Commercial Use Compatibility Matrix

| Use Case                          | Compatible | Notes                                     |
| --------------------------------- | ---------- | ----------------------------------------- |
| Proprietary/Closed Source Product | Yes        | All licenses permit this                  |
| SaaS/Cloud Service                | Yes        | No restrictions                           |
| Embedded in Commercial Product    | Yes        | Attribution required                      |
| Reselling as Software             | Yes        | Attribution required                      |
| Modification without Disclosure   | Yes        | No copyleft obligations                   |
| Patent Use                        | Yes        | Apache 2.0 provides explicit patent grant |
| Sublicensing                      | Yes        | MIT/Apache allow this                     |

---

## Recommended Actions

### Immediate (Before Production Release)

1. **Generate Third-Party License File**

   ```bash
   npx license-checker --production --out THIRD_PARTY_LICENSES.txt
   ```

2. **Create Attribution File**
   Create `THIRD_PARTY_NOTICES.md` with:

   - List of all dependencies
   - Their licenses
   - Copyright notices
   - Full license texts

3. **Include in Build**
   Ensure license file is included in production deployments

### Ongoing Maintenance

1. **Pre-commit Hook**
   Check for new dependencies with restrictive licenses

2. **Automated Scanning**
   Integrate license checking in CI/CD:

   ```bash
   npx license-checker --production --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause;0BSD;Python-2.0" --failOn "GPL;AGPL;LGPL"
   ```

3. **Quarterly Review**
   Review licenses after major dependency updates

4. **Documentation**
   Keep license compliance documentation current

---

## Risk Mitigation

### Low Risk Items (Current Status)

- All current licenses are permissive
- No viral/copyleft concerns
- Patent grants where applicable (Apache 2.0)

### Potential Future Risks

- License changes in dependency updates
- New dependencies with incompatible licenses
- Transitive dependencies bringing in restrictive licenses

### Mitigation Strategy

1. Lock dependency versions (already done - versions frozen)
2. Review licenses before major updates
3. Automated license checking in CI/CD
4. Maintain license inventory
5. Legal review for major commercial deployments

---

## Legal Disclaimer

This audit provides technical analysis of software licenses. For legal advice regarding license compliance, patent rights, or commercial use in specific jurisdictions, consult with a qualified intellectual property attorney.

---

## Tools Used

- **license-checker:** npm package for license extraction
- **npm list:** Package tree analysis
- Manual review of package.json files

---

## References

- [ChooseALicense.com](https://choosealicense.com/)
- [OSI Approved Licenses](https://opensource.org/licenses)
- [SPDX License List](https://spdx.org/licenses/)
- [TLDRLegal](https://www.tldrlegal.com/)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [MIT License](https://opensource.org/licenses/MIT)

---

## Audit Metadata

**Audit Method:** Automated + Manual Review
**Auditor:** Security Audit System
**Next Review Date:** 2026-05-05 (Quarterly)
**Production Dependencies Audited:** 364 packages
**Risk Level:** LOW
**Commercial Use:** APPROVED (with attribution)
