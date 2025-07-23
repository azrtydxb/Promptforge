# Admin Guide for Promptforge

This guide explains how to use the admin functionality in Promptforge.

## Making a User an Admin

To make a user an admin, you need to run the make-admin script:

```bash
npm run make-admin <user-email>
```

Example:
```bash
npm run make-admin admin@example.com
```

This will update the user's role to ADMIN in the database.

## Admin Features

Once you're an admin, you'll see an "Admin" link in the sidebar. The admin dashboard includes:

### 1. **Statistics Dashboard**
- Total users count
- Active users
- Number of admins and moderators
- Verified email accounts
- New users this month

### 2. **User Management**
- View all users with search functionality
- Edit user details (name, email)
- Change user roles (User, Moderator, Admin)
- Activate/deactivate user accounts
- Reset user passwords
- Delete users (except yourself)
- View user statistics (prompts created, published)

### 3. **AI Settings Configuration**
- Add multiple AI provider configurations
- Supported providers:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3 models)
  - Google (Gemini models)
- Configure:
  - API keys (encrypted storage)
  - Model parameters (temperature, max tokens, top_p)
  - Rate limits per configuration
  - Monthly usage quotas
- Test connection to verify API keys
- Set default AI provider
- Enable/disable configurations

## Security Features

- **Role-based access**: Only ADMIN users can access the admin panel
- **API key encryption**: All API keys are encrypted before storage
- **Audit logging**: All admin actions are logged
- **Self-protection**: Admins cannot:
  - Remove their own admin privileges
  - Delete their own account
  - Deactivate their own account

## Environment Variables

Add these to your `.env` file:

```env
# Required for AI key encryption
AI_KEY_ENCRYPTION_SECRET="your-secure-encryption-key"

# Optional logging level
LOG_LEVEL="info"
```

## User Roles

- **USER**: Standard user with access to personal prompts
- **MODERATOR**: Can moderate shared content (future feature)
- **ADMIN**: Full access to admin panel and user management

## Best Practices

1. **API Key Security**
   - Use strong encryption secrets in production
   - Rotate API keys regularly
   - Monitor usage through the dashboard

2. **User Management**
   - Regularly review inactive accounts
   - Use email verification for new accounts
   - Monitor new user registrations

3. **AI Configuration**
   - Set appropriate rate limits
   - Monitor monthly usage against quotas
   - Have fallback configurations ready
   - Test connections after adding new keys

## Troubleshooting

### Can't access admin panel
1. Verify your account has ADMIN role
2. Check you're logged in
3. Try clearing browser cache

### API key test fails
1. Verify the API key is correct
2. Check the provider service status
3. Ensure your IP is whitelisted (if applicable)
4. Check rate limits haven't been exceeded

### Make-admin script fails
1. Ensure the user exists in the database
2. Check database connection in .env
3. Verify you have the correct email address

## Future Admin Features

Planned enhancements include:
- Content moderation queue
- System health monitoring
- Backup and restore functionality
- Email template management
- Feature flags management
- Analytics dashboard
- Audit log viewer