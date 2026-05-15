# Agent Instructions: Bi-Survey Automation

This project handles the automated synchronization of Dotdigital survey responses into the Enda BI system.

## ⚠️ Critical Authentication Requirements

The Enda BI API uses Firebase ID Token verification for all requests. To ensure this automation works correctly, it **MUST** authenticate against the main production Firebase project.

### 1. Firebase Project Alignment
- **Main Project ID**: `enda-document-control-prod`
- All ID tokens must be issued by this project.
- Do **NOT** use a separate Firebase project for authentication, or the API will reject the requests with a 401/403 error.

### 2. Required Secrets
The following secrets must be configured in Google Cloud Functions (v2):
- `DOTDIGITAL_API_USERNAME`: API user for Dotdigital.
- `DOTDIGITAL_API_PASSWORD`: API password for Dotdigital.
- `IDENTITY_API_KEY`: The **Web API Key** from the `enda-document-control-prod` Firebase project settings.
- `BOT_EMAIL`: An email ending in `@sitikhadijah.com` registered in the main Firebase project.
- `BOT_PASSWORD`: The password for the bot user.

> [!IMPORTANT]
> **Email Verification**: The `BOT_EMAIL` account **MUST** have its email verified in Firebase Auth. The API will return `403 Forbidden` if `email_verified` is false.

### 3. Verification Logic
The API performs the following checks:
1. Validates the JWT signature against Firebase.
2. Ensures the `aud` (audience) matches `enda-document-control-prod`.
3. Ensures the email domain is `@sitikhadijah.com`.
4. Ensures `email_verified` is `true`.

## Deployment
When deploying functions:
```bash
firebase deploy --only functions:syncDotdigitalSurveys --project enda-document-control-prod
```

### Setting Secrets
Before deploying, ensure all secrets are set in the project:
```bash
firebase functions:secrets:set DOTDIGITAL_API_USERNAME --project enda-document-control-prod
firebase functions:secrets:set DOTDIGITAL_API_PASSWORD --project enda-document-control-prod
firebase functions:secrets:set IDENTITY_API_KEY --project enda-document-control-prod
firebase functions:secrets:set BOT_EMAIL --project enda-document-control-prod
firebase functions:secrets:set BOT_PASSWORD --project enda-document-control-prod
```

## Troubleshooting
If you receive `403 Forbidden: Only @sitikhadijah.com accounts are permitted`:
1. Check that `BOT_EMAIL` actually ends with that domain.
2. Ensure the `IDENTITY_API_KEY` is from the correct project. If the key is from a different project, the token will be valid but have the wrong Project ID inside it.
3. **Check verification**: Ensure the user is verified in the Firebase Console.
