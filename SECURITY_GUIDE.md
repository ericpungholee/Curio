# Security Setup Guide for Curio

## 🚨 CRITICAL: Secret Management

### 1. Environment Variables Setup

**DO NOT COMMIT SECRETS TO GIT!**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Replace placeholder values with your actual Supabase credentials:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the Project URL and API keys

3. **NEVER** commit the `.env` file to git

### 2. Supabase Keys Explained

- **SUPABASE_URL**: Your project URL (safe to expose)
- **SUPABASE_KEY**: Anonymous/public key (safe to expose in frontend)
- **SUPABASE_SERVICE_ROLE_KEY**: ⚠️ **HIGH PRIVILEGE** - Keep secret!

### 3. Security Best Practices

#### ✅ DO:
- Use environment variables for all secrets
- Keep `.env` files in `.gitignore`
- Use different keys for development/production
- Rotate keys regularly
- Use least-privilege access

#### ❌ DON'T:
- Hardcode secrets in source code
- Commit `.env` files to git
- Share service role keys
- Use production keys in development

### 4. Key Rotation

If your keys are compromised:
1. Go to Supabase Dashboard > Settings > API
2. Generate new API keys
3. Update your `.env` file
4. Restart your application

### 5. Production Deployment

For production:
- Use environment variables from your hosting platform
- Never use development keys in production
- Consider using a secrets management service
- Enable Supabase RLS (Row Level Security) policies

### 6. Monitoring

- Monitor your Supabase usage for unusual activity
- Set up alerts for failed authentication attempts
- Regularly review API key usage

## Current Security Status

✅ **Secure**: No hardcoded secrets found in source code
✅ **Secure**: Proper environment variable usage
⚠️ **Action Required**: Set up `.env` file with actual credentials
⚠️ **Action Required**: Ensure `.env` is in `.gitignore`

## Next Steps

1. Create your `.env` file with real credentials
2. Test your application
3. Verify no secrets are committed to git
4. Set up production environment variables
