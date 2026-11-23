# Google sign-in setup

The ClosetAI backend already implements a server-side Google OpenID Connect authorization-code flow with state and PKCE. The local Google account chooser cannot appear until a real **Web application OAuth client** is configured. The client ID and secret are absent from the current local backend environment. Example values in `.env.example` are placeholders.

## Create the local OAuth client

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), select a project, complete its branding and audience configuration, and create an OAuth client with application type **Web application**. Use the account that should own this integration.
2. Add `http://localhost:4000/api/v1/auth/google/callback` as an **Authorized redirect URI**. It must match `GOOGLE_CALLBACK_URL` exactly, including `localhost`, port, scheme, and path. For local development, the frontend is `http://localhost:3001`; add it as an authorized JavaScript origin if the console requests one. This server-side flow uses the redirect URI.
3. If the app is in Testing mode with an External audience, add the Google account you will test with as a test user. Request only the existing `openid`, `email`, and `profile` scopes.
4. Put the values in `apps/server/.env` (which is Git-ignored). Do not put the secret in `apps/web/.env.local`, `NEXT_PUBLIC_*`, a source file, a screenshot, or a chat message:

   ```env
   GOOGLE_CLIENT_ID=<client ID from Google>
   GOOGLE_CLIENT_SECRET=<client secret from Google>
   GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
   FRONTEND_URL=http://localhost:3001
   ALLOWED_ORIGINS=http://localhost:3001
   ```

5. Restart the backend after editing `.env`. Open `http://localhost:3001/login`, click **Continue with Google**, select the test account, and confirm the browser returns to `/dashboard` with a persisted session. Test signup with a second Google account, logout, and login again. Confirm no duplicate user was created. If Google reports `redirect_uri_mismatch`, compare the callback URL character for character. If Google says the app is unavailable to your account, check the audience/test-user list.

ClosetAI does not need a Google API key or a frontend Google client secret for this flow. The backend must never log or return tokens. A local test cannot establish production readiness; production needs HTTPS frontend/API URLs, the matching production callback, verified branding/audience, and cookie/CORS testing.

The setup follows Google's [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) and [OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect). Google documents that redirect URI mismatches reject authorization and that localhost HTTP is permitted for local testing.
