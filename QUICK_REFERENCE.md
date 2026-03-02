# Scrum Helper Multi-Platform - Quick Reference Guide

## 📚 Documentation Map

```
START HERE
    ↓
IMPLEMENTATION_SUMMARY.md (2 min read)
    ↓
    ├→ MULTI_PLATFORM_ARCHITECTURE.md (architecture deep dive)
    ├→ DESIGN_SYSTEM.md (design tokens & components)
    ├→ UI_UX_SPECIFICATIONS.md (wireframes & flows)
    ├→ IMPLEMENTATION_GUIDE.md (code templates)
    ├→ DIRECTORY_STRUCTURE_GUIDE.md (file organization)
    └→ This file (quick reference)
```

---

## 🎯 Core Concepts at a Glance

### 1. Plugin-Based Adapter Pattern

```
┌─ PlatformAdapter (abstract interface)
│
├─ GitHubAdapter (implements interface)
├─ GitLabAdapter (implements interface)
├─ GiteaAdapter (implements interface)
└─ BitbucketAdapter (implements interface)
```

### 2. Layers

```
UI Layer       → popup.html, popup.js UI components
Business Logic → reportGenerator, dataProcessor
Abstraction    → PlatformManager, adapters
Infrastructure → StorageManager, TokenManager
```

### 3. Storage Schema (Simplified)

```javascript
{
  activePlatform: 'github',
  platforms: {
    github: { accounts: { primary: {...} } },
    gitlab: { accounts: { primary: {...} } },
  },
  reportSettings: {...},
  cache: {...}
}
```

---

## 🔧 Implementation Phases

| Phase | What                                        | When     | Duration |
| ----- | ------------------------------------------- | -------- | -------- |
| 1     | Foundation (Manager, Interface, Storage)    | Week 1-2 | 2 weeks  |
| 2     | Adapters (GitHub, GitLab, Gitea, Bitbucket) | Week 3-4 | 2 weeks  |
| 3     | UI/UX Redesign                              | Week 5-6 | 2 weeks  |
| 4     | Report Generation                           | Week 7   | 1 week   |
| 5     | Testing                                     | Week 8   | 1 week   |
| 6     | Deployment                                  | Week 9   | 1 week   |

---

## 📁 File Organization

### New Directories to Create

```
src/scripts/core/           Core infrastructure
src/scripts/adapters/       Platform adapters
src/scripts/ui/             UI components
src/scripts/formatters/     Report formatters
src/styles/                 Redesigned styles
tests/                      Test suite
docs/                       Detailed documentation
```

### Key Files to Create

```
PlatformManager.js          Platform registration & switching
PlatformInterface.js        Abstract base class
GitHubAdapter.js            GitHub implementation
GitLabAdapter.js            GitLab implementation
GiteaAdapter.js             Gitea implementation
BitbucketAdapter.js         Bitbucket implementation
StorageManager.js           Unified storage
TokenManager.js             Token encryption
```

---

## 🎨 Design System Quick Reference

### Colors

```
Primary:  #2563eb (hover: #1d4ed8)
Success:  #16a34a (hover: #15803d)
Warning:  #f59e0b
Error:    #dc2626
Neutral:  #6b7280
```

### Spacing (8px grid)

```
xs: 4px    sm: 8px    md: 16px   lg: 24px   xl: 32px
```

### Typography

```
H1: 32px 700wt    H2: 24px 700wt    Body: 14px 400wt    Label: 12px 600wt
```

### Breakpoints

```
Mobile: < 360px    Tablet: 640px    Desktop: 1024px    Large: 1280px
```

---

## 🔄 User Flows (30-Second Version)

### First-Time Setup

1. Select platform → Enter token → Validate → Done

### Generate Report

1. Adjust dates → Click Generate → Report appears → Copy/Send

---

## 💾 Storage Migration

### From v1 (GitHub-only) to v2 (Multi-platform)

```javascript
// Old format
{
  platformUsername: 'john-doe',
  githubToken: 'gh_****',
  orgName: 'company'
}

// New format
{
  activePlatform: 'github',
  platforms: {
    github: {
      accounts: {
        primary: {
          username: 'john-doe',
          token: 'gh_****',
          organization: 'company'
        }
      }
    }
  }
}
```

---

## 🔐 Security Checklist

- [ ] Tokens encrypted at rest (SubtleCrypto)
- [ ] Tokens not logged to console
- [ ] Tokens only sent to official APIs
- [ ] Data stored locally only
- [ ] No third-party data sharing
- [ ] Rate limiting implemented
- [ ] Input validation on all fields
- [ ] Error messages don't leak credentials

---

## 🧪 Testing Strategy Overview

### Unit Tests (Each adapter)

```javascript
✓ Validate credentials
✓ Fetch user profile
✓ Get pull requests
✓ Get issues
✓ Get commits
✓ Error handling
```

### Integration Tests (Workflows)

```javascript
✓ Platform switching
✓ Report generation
✓ Storage migration
✓ Token validation
✓ Cache management
```

### E2E Tests (Complete flows)

```javascript
✓ First-time setup
✓ Generate & send report
✓ Multi-account handling
✓ Dark mode
✓ Responsive design
```

---

## 📋 Adapter Interface Methods

### Required Methods

```javascript
validateCredentials()        → Check token is valid
getUser()                   → Get profile info
getPullRequests(params)     → Get user's PRs
getIssues(params)           → Get user's issues
getCommits(params)          → Get user's commits
getReviewedPullRequests()   → Get reviewed PRs
```

### Optional Methods

```javascript
getRepositories(params)     → List repos
getPullRequestCommits()     → Commits in specific PR
getOrganization(name)       → Org/group info
healthCheck()               → API health status
```

---

## 🚀 Getting Started Checklist

### For Developers

- [ ] Read IMPLEMENTATION_SUMMARY.md
- [ ] Read IMPLEMENTATION_GUIDE.md
- [ ] Set up development environment
- [ ] Create base PlatformAdapter class
- [ ] Create PlatformManager
- [ ] Create StorageManager
- [ ] Implement first adapter (GitHub)
- [ ] Write unit tests
- [ ] Review & iterate

### For Designers

- [ ] Read DESIGN_SYSTEM.md
- [ ] Read UI_UX_SPECIFICATIONS.md
- [ ] Create Figma components
- [ ] Design platform-specific panels
- [ ] Validate accessibility (WCAG AA)
- [ ] Test dark mode
- [ ] Test responsive (360px+)

### For QA/Testers

- [ ] Read IMPLEMENTATION_GUIDE.md (testing section)
- [ ] Create test accounts for each platform
- [ ] Plan test scenarios
- [ ] Execute unit tests
- [ ] Execute integration tests
- [ ] Execute E2E tests
- [ ] Verify backward compatibility

---

## 🔗 Key Files to Read First

1. **Architecture Overview**
   → IMPLEMENTATION_SUMMARY.md (3 min)

2. **Technical Details**
   → MULTI_PLATFORM_ARCHITECTURE.md (30 min)

3. **Visual Design**
   → DESIGN_SYSTEM.md (20 min)
   → UI_UX_SPECIFICATIONS.md (20 min)

4. **Implementation**
   → IMPLEMENTATION_GUIDE.md (30 min)
   → DIRECTORY_STRUCTURE_GUIDE.md (10 min)

**Total Reading Time: ~2 hours**

---

## 🎓 Key Design Decisions

| Decision             | Why                         | Benefit                        |
| -------------------- | --------------------------- | ------------------------------ |
| Adapter Pattern      | Each platform isolated      | Easy to add new platforms      |
| Unified Interface    | All adapters implement same | Consistent testing, code reuse |
| Normalized Storage   | Platform-agnostic schema    | Simple data migrations         |
| Layered Architecture | Separation of concerns      | Maintainable, testable code    |
| Component-Based UI   | Reusable components         | Consistent UX across platforms |
| Design System CSS    | Token-based approach        | Easy theme/dark mode support   |
| Local Storage Only   | Privacy first               | No cloud dependencies          |
| Backward Compatible  | v1→v2 migration script      | Existing users not impacted    |

---

## ⚠️ Common Pitfalls to Avoid

1. ❌ **Hardcoding platform logic in core**
   - ✅ Always extend PlatformAdapter

2. ❌ **Not implementing storage migration**
   - ✅ Plan migration from day 1

3. ❌ **Logging credentials**
   - ✅ Use error.message, never token values

4. ❌ **Assuming same API response format**
   - ✅ Normalize in each adapter

5. ❌ **Breaking backward compatibility**
   - ✅ Always provide migration path

6. ❌ **Tight coupling between adapters**
   - ✅ Each adapter should be independent

7. ❌ **Heavy CSS files**
   - ✅ Organize by layer (tokens → components → platforms)

---

## 📞 Quick Answers

**Q: Where do I start implementing?**
A: Phase 1 - Create PlatformManager and PlatformInterface

**Q: How do I structure a new adapter?**
A: Extend PlatformAdapter, implement all required methods

**Q: What about backward compatibility?**
A: StorageManager handles v1→v2 migration automatically

**Q: How do I test multi-platform?**
A: Create test accounts, use same tests for all adapters

**Q: Should I bundle JavaScript?**
A: Keep individual files for now, bundle only if performance issues

**Q: What about self-hosted instances?**
A: Pass baseUrl in config, support in GitLab, Gitea adapters

**Q: How are tokens stored securely?**
A: Encrypted using SubtleCrypto API

**Q: Will existing GitHub users need to re-authenticate?**
A: No, automatic migration preserves their token

---

## 📊 Expected Outcomes

### After Phase 1 (Week 2)

- Core infrastructure in place
- Storage schema implemented
- PlatformManager working
- First adapter template ready

### After Phase 2 (Week 4)

- All 4 adapters implemented
- Each 90%+ API method coverage
- Comprehensive unit tests passing

### After Phase 3 (Week 6)

- Popup redesigned for multi-platform
- Platform selector working
- Settings panels per platform
- UI tests passing

### After Phase 6 (Week 9)

- All 4 platforms fully functional
- Full test coverage (unit + integration + E2E)
- Production-ready
- Zero breaking changes for GitHub users

---

## 🎯 Success Metrics

- ✅ 100% GitHub compatibility maintained
- ✅ GitLab with cloud & self-hosted support
- ✅ Gitea fully functional
- ✅ Bitbucket fully functional
- ✅ < 2 second report generation
- ✅ All tests passing (>90% coverage)
- ✅ WCAG AA accessibility compliance
- ✅ Dark mode working smoothly
- ✅ Mobile responsive (360px+)
- ✅ New user setup < 2 minutes

---

## 📅 Recommended Reading Order

```
Day 1: Read IMPLEMENTATION_SUMMARY.md (get overview)
Day 2: Read MULTI_PLATFORM_ARCHITECTURE.md (understand design)
Day 3: Read IMPLEMENTATION_GUIDE.md (see code structure)
Day 4: Read DIRECTORY_STRUCTURE_GUIDE.md (plan file layout)
Day 5: Set up development environment & start Phase 1
```

---

## 🔍 When to Reference Each Document

| Need                  | Reference                      |
| --------------------- | ------------------------------ |
| Architecture overview | IMPLEMENTATION_SUMMARY.md      |
| System design details | MULTI_PLATFORM_ARCHITECTURE.md |
| Component styles      | DESIGN_SYSTEM.md               |
| Wireframes & flows    | UI_UX_SPECIFICATIONS.md        |
| Code templates        | IMPLEMENTATION_GUIDE.md        |
| File organization     | DIRECTORY_STRUCTURE_GUIDE.md   |
| Quick lookup          | This file                      |

---

## 💡 Pro Tips

1. **Start with GitHub adapter** - Use existing code as reference
2. **Test each phase** - Don't wait for all 6 weeks
3. **Use TypeScript if possible** - Better IDE support (optional)
4. **Document as you code** - JSDoc comments help future devs
5. **Keep adapters independent** - No inter-adapter dependencies
6. **Version the storage schema** - Make migrations easy
7. **Create adapter test factory** - Same tests for all adapters
8. **Use dark mode CSS variables** - Easier maintenance

---

## 📞 Support Resources

- **Architecture Questions** → MULTI_PLATFORM_ARCHITECTURE.md
- **Design Questions** → DESIGN_SYSTEM.md + UI_UX_SPECIFICATIONS.md
- **Implementation Questions** → IMPLEMENTATION_GUIDE.md
- **File Organization** → DIRECTORY_STRUCTURE_GUIDE.md
- **Quick Lookup** → This file

---

**Last Updated:** March 2, 2024  
**Version:** 1.0  
**Status:** Ready for Implementation

---

_For detailed information, refer to the comprehensive documents linked above._
