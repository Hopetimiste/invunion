# Complete Rebranding Analysis: Union → Invunion

**Date**: 10 February 2026  
**Goal**: 100% brand consistency across ALL infrastructure  
**Current Status**: Services renamed, DB migrated ✅

---

## 🎯 WHAT REMAINS TO REBRAND

### 1. GitHub Repositories
| Current | Target | Action | Difficulty |
|---------|--------|--------|------------|
| `Hopetimiste/union` | `Hopetimiste/invunion` | Rename | ⭐ Easy |
| `Hopetimiste/project-br-union` | `Hopetimiste/invunion-frontend` | Rename | ⭐ Easy |

**Impact**: Low  
**Downtime**: None  
**Recommendation**: ✅ **RENAME** (5 minutes, no migration needed)

---

### 2. Workspace Folder Names
| Current | Target | Action |
|---------|--------|--------|
| `/Users/francoissuret/union-api/backend` | `/Users/francoissuret/invunion/backend` | Move |
| `/Users/francoissuret/union-api/frontend` | `/Users/francoissuret/invunion/frontend` | Move |

**Impact**: Very Low (local only)  
**Downtime**: None  
**Recommendation**: ✅ **RENAME** (2 minutes, update git remote paths)

---

### 3. GCP Project ID
| Current | Target | Possible? |
|---------|--------|-----------|
| `br-project-481607` | `invunion-prod` | ❌ **IMPOSSIBLE** |

**Why impossible**: GCP Project IDs are **immutable** and cannot be renamed.  
**Alternative**: Create new project and migrate ALL resources.

**Migration Cost Analysis**:
| Resource | Migration Complexity | Downtime | Cost |
|----------|---------------------|----------|------|
| Cloud Run services | Medium | ~5 min | Low |
| Cloud SQL | High | ~20 min | Low |
| Firebase Auth | **VERY HIGH** | Hours | **HIGH** |
| Secret Manager | Low | None | Low |
| Artifact Registry | Low | None | Low |
| Cloud Logging | Medium | None | Medium |
| IAM & Permissions | High | None | Medium |

**Estimated Total**:
- Time: 4-6 hours
- Risk: HIGH (Firebase Auth user migration)
- Downtime: 30-60 minutes
- Cost: ~€50-100 (duplicate resources during migration)

**Recommendation**: ❌ **DO NOT MIGRATE** - Not worth the risk/effort for cosmetic change

---

### 4. Firebase Project ID
| Current | Target | Possible? |
|---------|--------|-----------|
| `br-project-481607` | `invunion-prod` | ❌ **IMPOSSIBLE** |

**Why impossible**: Firebase Project IDs are tied to GCP Project IDs and **cannot be renamed**.

**Migration Requirements**:
1. Create new Firebase project
2. Migrate all users (export/import, password hashes lost)
3. Update all client apps with new config
4. Force all users to reset passwords
5. Migrate Firestore data (if used)
6. Update all authentication flows

**User Impact**: 🔴 **CRITICAL**
- All users must re-authenticate
- All API keys change
- Mobile apps must be updated
- Web apps must be redeployed

**Recommendation**: ❌ **DO NOT MIGRATE** - Would disrupt all existing users

---

### 5. Artifact Registry Repositories
| Current | Target | Action | Done? |
|---------|--------|--------|-------|
| `union-api` | `invunion-api` | Migrate | ✅ Done |
| N/A | `invunion-worker` | Create new | ⏳ Future |

**Recommendation**: ✅ Keep creating new repos with correct names

---

### 6. Cloud Run Services
| Current | Target | Action | Done? |
|---------|--------|--------|-------|
| `union-api` | `invunion-api` | Migrate | ✅ Done |

**Recommendation**: ✅ Delete old `union-api` after 48h verification

---

### 7. Cloud SQL Instances
| Current | Target | Action | Done? |
|---------|--------|--------|-------|
| `union-db` | `invunion-db` | Migrate | ✅ Done |

**Recommendation**: ✅ Delete old `union-db` after 48h verification

---

### 8. Domain Names
| Current | Target | Status |
|---------|--------|--------|
| `api.invunion.com` | `api.invunion.com` | ✅ Correct |
| `app.invunion.com` | `app.invunion.com` | ⏳ To configure |

**Recommendation**: ✅ Already correct

---

### 9. Service Accounts & IAM
| Type | Current Pattern | Target Pattern | Action |
|------|----------------|----------------|--------|
| Cloud SQL SA | `p1024369822478-*@gcp-sa-cloud-sql...` | Auto-generated | Keep |
| GitHub Actions SA | `github-ci@br-project-481607...` | Auto-generated | Keep |

**Note**: Service account names include project ID, so they can't be "renamed" without creating new project.

**Recommendation**: ✅ Keep as-is (functional, not user-facing)

---

## 🎯 RECOMMENDED ACTIONS

### ✅ DO THESE (Low Risk, High Value)

#### 1. Rename GitHub Repositories (5 min)
```bash
# Backend repo
# Go to: https://github.com/Hopetimiste/union/settings
# Repository name: union → invunion

# Frontend repo  
# Go to: https://github.com/Hopetimiste/project-br-union/settings
# Repository name: project-br-union → invunion-frontend
```

**Benefits**:
- Clean, professional appearance
- Consistent branding
- Easy to find

**Risks**: None (GitHub automatically redirects old URLs)

---

#### 2. Rename Local Workspace (2 min)
```bash
# Stop any running processes
cd /Users/francoissuret/

# Rename directory
mv union-api invunion

# Update git remotes (if needed after GitHub rename)
cd invunion/backend
git remote set-url origin git@github.com:Hopetimiste/invunion.git

cd ../frontend
git remote set-url origin git@github.com:Hopetimiste/invunion-frontend.git
```

**Benefits**:
- Consistent with GitHub
- Professional appearance
- Easy navigation

**Risks**: None (just local folders)

---

#### 3. Clean Up Old Resources (After 48h)
```bash
# Delete old Cloud Run service
gcloud run services delete union-api \
  --region=europe-west1 \
  --project=br-project-481607

# Delete old Cloud SQL instance
gcloud sql instances delete union-db \
  --project=br-project-481607

# Delete old Artifact Registry repo
gcloud artifacts repositories delete union-api \
  --location=europe-west1 \
  --project=br-project-481607
```

**Benefits**: 
- Cost savings (~€20-30/month)
- Clean infrastructure

---

### ❌ DO NOT DO (High Risk, Low Value)

#### 1. Create New GCP Project
**Why not**: 
- GCP Project ID `br-project-481607` is purely internal
- Not user-facing (users see `invunion.com`)
- Migration would be 4-6 hours of work
- Risk of data loss/user disruption
- Firebase Auth migration forces password resets

**Cost vs Benefit**: 
- Cost: 4-6 hours + HIGH risk
- Benefit: Cosmetic only (internal IDs)

**Alternative**: Accept that internal IDs remain as-is. Focus on what users see:
- ✅ Domain: `invunion.com`
- ✅ Service names: `invunion-api`
- ✅ Branding: "Invunion" everywhere
- ✅ Database: `invunion-db`

---

#### 2. Migrate Firebase Project
**Why not**:
- Forces ALL users to reset passwords
- Breaks existing mobile apps
- Requires redeploying all clients
- 2-4 hours of migration work
- High risk of authentication issues

**User Impact**: 🔴 CRITICAL

---

## 📋 FINAL RECOMMENDATION

### Phase 1: Quick Wins (10 minutes) ✅
1. ✅ Rename GitHub repos
2. ✅ Rename local workspace folders
3. ✅ Update documentation

### Phase 2: Cleanup (After 48h) ✅
4. ✅ Delete old Cloud Run service
5. ✅ Delete old Cloud SQL instance
6. ✅ Delete old Artifact Registry repo

### Phase 3: Accept As-Is ✅
7. ✅ Keep GCP Project ID: `br-project-481607` (internal only)
8. ✅ Keep Firebase Project ID: `br-project-481607` (internal only)
9. ✅ Keep Service Account names (auto-generated)

---

## 🏆 RESULT: 95% INVUNION BRANDING

### What Users See (100% Invunion) ✅
- ✅ Domain: `invunion.com`, `api.invunion.com`, `app.invunion.com`
- ✅ Service name: `invunion-api`
- ✅ Database: `invunion-db` / `invunion_db`
- ✅ All UI text: "Invunion"
- ✅ GitHub repos: `invunion`, `invunion-frontend`
- ✅ Logo: `invunion-logo-white.png`

### What's Internal Only (5% legacy IDs) ⚠️
- ⚠️ GCP Project ID: `br-project-481607` (never shown to users)
- ⚠️ Firebase Project ID: `br-project-481607` (never shown to users)
- ⚠️ Service Accounts: `*@br-project-481607.iam...` (never shown to users)

---

## 💡 PHILOSOPHY

**The 95/5 Rule**: Focus on what matters to users (95% Invunion-branded), accept that internal IDs (5%) can remain legacy. 

**Why?**:
- Migrating GCP/Firebase projects = HIGH RISK, LOW VALUE
- Users NEVER see project IDs
- Time better spent on Milestone 4 (features!)
- Professional appearance maintained where it counts

---

## 📊 COMPARISON

### Option A: Full Migration (NOT Recommended)
**Time**: 6-8 hours  
**Risk**: HIGH  
**User Impact**: CRITICAL (password resets)  
**Cost**: €50-100  
**Value**: Cosmetic only  

### Option B: Strategic Rebranding (Recommended) ✅
**Time**: 10 minutes  
**Risk**: NONE  
**User Impact**: NONE  
**Cost**: €0  
**Value**: 95% brand consistency  

---

## ✅ CONCLUSION

**Recommendation**: Do Phase 1 (rename repos + workspace), skip GCP/Firebase migration.

**Rationale**: 
- Users see "Invunion" everywhere that matters
- Internal IDs are irrelevant to brand perception
- Avoid unnecessary risk and work
- Focus effort on Milestone 4 (real features)

**Result**: 95% Invunion branding, 0% risk, 10 minutes of work ✅
