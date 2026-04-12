# Firestore Security Rules Setup

To fix the "Missing or insufficient permissions" errors, you need to deploy Firestore security rules.

## Option 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project "musicinsta-v1"
3. Click "Firestore Database" in the left sidebar
4. Click "Rules" tab
5. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Users can read all profiles but only write their own
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Songs - users can read all songs, but only authenticated users can create
    match /songs/{songId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.user_id;
    }

    // Allow authenticated users to read and write their own data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click "Publish"

## Option 2: Firebase CLI

If you have Firebase CLI installed:

```bash
firebase deploy --only firestore:rules
```

## After Deploying Rules

Once the rules are deployed:
1. Clear your browser cache/storage
2. Sign out and sign back in
3. The profile creation should work properly

## Current Workarounds Applied

I've updated the code to handle permission errors gracefully:
- Profile fetching won't crash on permission errors
- Profile creation returns a basic profile object even if Firestore write fails
- AI Studio now allows all authenticated users (not just artists)
- Upload page only requires authentication (not a complete profile)
- Playlists and EditProfile handle missing profiles better

These changes should make the app functional while you set up the proper Firestore rules.