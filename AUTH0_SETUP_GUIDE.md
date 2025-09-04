# Auth0 Setup Guide for WeathWise

This guide will help you set up Auth0 authentication for your WeathWise application.

## Step 1: Create Auth0 Account

1. Go to [Auth0.com](https://auth0.com)
2. Click "Sign Up" and create a free account
3. Choose "Personal" plan (free tier)

## Step 2: Create Auth0 Application

1. **Log into Auth0 Dashboard**
   - Go to [manage.auth0.com](https://manage.auth0.com)
   - Navigate to Applications → Applications

2. **Create New Application**
   - Click "Create Application"
   - Name: "WeathWise Frontend"
   - Type: "Single Page Application"
   - Click "Create"

3. **Configure Application Settings**
   - In your new application, go to "Settings" tab
   - Configure these URLs:
     - **Allowed Callback URLs**: `http://localhost:5173/callback,http://localhost:5173`
     - **Allowed Logout URLs**: `http://localhost:5173`
     - **Allowed Web Origins**: `http://localhost:5173`
   - Click "Save Changes"

4. **Copy Application Credentials**
   - Note down your **Domain** (e.g., `your-tenant.auth0.com`)
   - Note down your **Client ID**

## Step 3: Create Auth0 API

1. **Create API**
   - Go to Applications → APIs
   - Click "Create API"
   - Name: "WeathWise API"
   - Identifier: `https://wealthwise-api.com`
   - Signing Algorithm: RS256
   - Click "Create"

2. **Configure API Settings**
   - Go to the "Settings" tab of your API
   - Note down the **Identifier** (this is your audience)

## Step 4: Update Environment Variables

1. **Open your `env` file** in the root directory
2. **Replace the Auth0 configuration** with your actual values:

```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-tenant-name.auth0.com
VITE_AUTH0_CLIENT_ID=your-frontend-client-id
VITE_AUTH0_AUDIENCE=https://wealthwise-api.com

# Auth0 Backend Configuration
AUTH0_DOMAIN=your-tenant-name.auth0.com
AUTH0_CLIENT_ID=your-backend-client-id
AUTH0_CLIENT_SECRET=your-backend-client-secret
AUTH0_AUDIENCE=https://wealthwise-api.com
```

**Replace these values:**
- `your-tenant-name.auth0.com` → Your actual Auth0 domain
- `your-frontend-client-id` → Your frontend application Client ID
- `your-backend-client-id` → Your backend application Client ID (if different)
- `your-backend-client-secret` → Your backend application Client Secret

## Step 5: Test the Configuration

1. **Start your frontend application:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to your application:**
   - Go to `http://localhost:5173`
   - You should be redirected to the login page

3. **Test the login flow:**
   - Click "Sign in with Auth0"
   - You should be redirected to Auth0's login page
   - Complete the login process
   - You should be redirected back to your dashboard

## Troubleshooting

### Common Issues:

1. **"Unknown host" error:**
   - Make sure you've replaced `your-tenant-name.auth0.com` with your actual Auth0 domain
   - Check that your Auth0 domain is correct in the dashboard

2. **CORS errors:**
   - Ensure your Allowed Web Origins includes `http://localhost:5173`
   - Check that your Allowed Callback URLs are correct

3. **Redirect errors:**
   - Verify your Allowed Callback URLs include both `http://localhost:5173/callback` and `http://localhost:5173`
   - Make sure there are no extra spaces or typos

4. **Token errors:**
   - Ensure your API identifier (audience) matches between frontend and backend
   - Check that your API is properly configured in Auth0

### Debug Steps:

1. **Check browser console** for any JavaScript errors
2. **Check Network tab** to see if requests are being made correctly
3. **Verify environment variables** are being loaded properly
4. **Restart your development server** after making changes

## Example Configuration

Here's what your Auth0 configuration should look like (replace with your actual values):

```env
# Frontend Auth0 Config
VITE_AUTH0_DOMAIN=dev-abc123.us.auth0.com
VITE_AUTH0_CLIENT_ID=abc123def456ghi789
VITE_AUTH0_AUDIENCE=https://wealthwise-api.com

# Backend Auth0 Config
AUTH0_DOMAIN=dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=abc123def456ghi789
AUTH0_CLIENT_SECRET=your-secret-here
AUTH0_AUDIENCE=https://wealthwise-api.com
```

## Next Steps

Once authentication is working:

1. **Test user registration and login**
2. **Verify API calls work with authentication**
3. **Test protected routes**
4. **Configure additional Auth0 features** (social login, MFA, etc.)

## Support

If you're still having issues:
1. Check the Auth0 documentation: [auth0.com/docs](https://auth0.com/docs)
2. Verify your Auth0 application settings
3. Check the browser console for detailed error messages


