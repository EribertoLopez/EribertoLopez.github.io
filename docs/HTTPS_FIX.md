# 🔒 HTTPS Configuration Fix

## Current Issues

1. **HTTPS not enforced** — Site loads on `http://` but doesn't redirect to `https://`
2. **Redirect loop on HTTP** — Causes issues for visitors
3. **Domain unverified** — Custom domain `eribertolopez.com` shows as unverified

## How to Fix (Manual Steps Required)

### Step 1: Verify Domain on GitHub

1. Go to https://github.com/settings/pages
2. Click "Add a domain"
3. Add `eribertolopez.com`
4. Follow DNS verification steps (add TXT record)

### Step 2: Check DNS Records

Your domain registrar should have these records:

```
Type    Name    Value
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
AAAA    @       2606:50c0:8000::153
AAAA    @       2606:50c0:8001::153
AAAA    @       2606:50c0:8002::153
AAAA    @       2606:50c0:8003::153
CNAME   www     eribertolopez.github.io
```

### Step 3: Enable HTTPS Enforcement

1. Go to https://github.com/EribertoLopez/EribertoLopez.github.io/settings/pages
2. Scroll to "Custom domain"
3. Check "Enforce HTTPS" ✓

If the checkbox is grayed out, wait for DNS propagation (can take up to 24 hours).

### Step 4: Verify

After enabling, test:
- `http://eribertolopez.com` → should redirect to `https://`
- `https://eribertolopez.com` → should load with valid certificate

## Why This Matters

- 🔒 Security: HTTPS encrypts traffic
- 📊 SEO: Google ranks HTTPS sites higher
- 🎨 Professionalism: No browser warnings
- ⚡ Performance: HTTP/2 requires HTTPS

---

*Created by Coral 🪸 | 2026-02-07*
