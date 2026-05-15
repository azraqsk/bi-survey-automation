# Agent Instructions: Bi-Survey Automation

This project synchronizes Dotdigital survey responses into the Enda BI system.

## ⚠️ Authentication Requirements

The API uses Firebase ID Token verification. All requests must authenticate against the production Firebase project.

### 1. Required Secrets
Configure these in Google Cloud Functions (v2):
- `DOTDIGITAL_API_USERNAME`: API user for Dotdigital.
- `DOTDIGITAL_API_PASSWORD`: API password for Dotdigital.
- `IDENTITY_API_KEY`: The **Web API Key** from the `enda-document-control-prod` project.
- `BOT_EMAIL`: An email ending in `@sitikhadijah.com` registered and **verified** in the `enda-document-control-prod` project.
- `BOT_PASSWORD`: The password for the bot user.

> [!IMPORTANT]
> **Email Verification**: The `BOT_EMAIL` account **MUST** be verified in Firebase Auth, or the API will return a `403 Forbidden` error.

## 🚀 Deployment

### Targeting the Function
To prevent accidental deletion of other functions in the shared project, **always** deploy using the specific target:
```bash
firebase deploy --only functions:syncDotdigitalSurveys --project enda-document-control-prod
```

### Setting Secrets
Run these commands to configure the environment:
```bash
firebase functions:secrets:set DOTDIGITAL_API_USERNAME --project enda-document-control-prod
firebase functions:secrets:set DOTDIGITAL_API_PASSWORD --project enda-document-control-prod
firebase functions:secrets:set IDENTITY_API_KEY --project enda-document-control-prod
firebase functions:secrets:set BOT_EMAIL --project enda-document-control-prod
firebase functions:secrets:set BOT_PASSWORD --project enda-document-control-prod
```

## 🛠️ Troubleshooting
If you receive `403 Forbidden`:
1. Ensure `BOT_EMAIL` ends with `@sitikhadijah.com`.
2. Ensure `IDENTITY_API_KEY` is from the `enda-document-control-prod` project.
3. Ensure the user's email is **Verified** in the Firebase Console.
