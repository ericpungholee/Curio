# URGENT: Git History Cleanup Commands

## ⚠️ CRITICAL: Your Supabase secrets are exposed in git history!

### Step 1: Backup your repository
```bash
git clone . ../curio-backup
```

### Step 2: Remove .env from git history using BFG (Recommended)
```bash
# Download BFG if you don't have it
# https://rtyley.github.io/bfg-repo-cleaner/

# Remove the .env file from all history
java -jar bfg.jar --delete-files ".env" .

# Clean up the repository
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

### Step 3: Alternative method using git filter-repo
```bash
# Install git-filter-repo if you don't have it
pip install git-filter-repo

# Remove .env from history
git filter-repo --path backend/.env --invert-paths

# Force push to update remote (DANGEROUS - coordinate with team)
git push origin --force --all
```

### Step 4: Verify cleanup
```bash
# Check that .env is no longer in history
git log --all --full-history -- backend/.env

# Should return no results
```

## ⚠️ IMPORTANT WARNINGS:

1. **Coordinate with your team** - Force pushing rewrites history
2. **Backup everything** before running these commands
3. **Rotate your Supabase keys** immediately (most important!)
4. **Update all clones** - Team members need to re-clone the repository

## Alternative: Start Fresh Repository

If the above seems too risky, consider:
1. Create a new repository
2. Copy your current code (without .env)
3. Add the new repository as origin
4. Push clean history

## Next Steps After Cleanup:

1. ✅ Rotate Supabase keys in dashboard
2. ✅ Update local .env with new keys
3. ✅ Test your application
4. ✅ Verify no secrets in git history
5. ✅ Share new repository URL with team
