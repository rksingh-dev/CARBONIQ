# Firebase Google Sign-In Authentication

This document describes the Firebase Google Sign-In authentication system integrated into the CarbonNN Blue Carbon Token application.

## Overview

The application now requires users to authenticate with Google before they can connect their wallet and access the dashboard. This ensures that all user data and token balances are properly associated with authenticated users.

## Authentication Flow

1. **User visits the application** - Can see the landing page but needs to sign in to access dashboard
2. **User clicks "Sign In with Google & Get Started"** - Opens Google Sign-In modal
3. **User signs in with Google** - Firebase handles Google authentication
4. **User connects wallet** - Only available after authentication
5. **User accesses dashboard** - Protected route with user-specific data

## Key Components

### Firebase Configuration
- **File**: `client/lib/firebase.ts`
- **Purpose**: Initializes Firebase app with your project configuration
- **Features**: Authentication and Firestore database

### Authentication Context
- **File**: `client/contexts/AuthContext.tsx`
- **Purpose**: Provides authentication state and methods throughout the app
- **Features**: Google Sign-In, logout, user state management

### Authentication Hooks
- **File**: `client/hooks/useAuth.tsx`
- **Purpose**: Easy access to authentication context
- **Usage**: `const { user, signInWithGoogle, logout } = useAuth();`

### UI Components
- **GoogleSignIn**: `client/components/auth/GoogleSignIn.tsx`
- **AuthModal**: `client/components/auth/AuthModal.tsx`
- **UserMenu**: `client/components/auth/UserMenu.tsx`
- **ProtectedRoute**: `client/components/auth/ProtectedRoute.tsx`

## Protected Routes

The dashboard is now protected and requires authentication:
- Users must be signed in to access `/dashboard`
- Unauthenticated users are redirected to the authentication modal
- Wallet connection is only available after authentication

## User-Specific Features

### Dashboard Personalization
- Welcome message with user's name/email
- User-specific token balance tracking
- Personal ticket management
- User-specific data fetching

### Header Integration
- Shows user menu when authenticated
- Displays "Sign In" and "Get Started" buttons when not authenticated
- Integrates wallet connection with authentication flow

## Firebase Configuration

The Firebase configuration uses your provided credentials:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD7gt4t92K2PWb2UWPGkRU9OIklqqA6ARs",
  authDomain: "superman-rahul.firebaseapp.com",
  projectId: "superman-rahul",
  storageBucket: "superman-rahul.firebasestorage.app",
  messagingSenderId: "745317052051",
  appId: "1:745317052051:web:19fa7b15c922947f04a766"
};
```

## Security Features

- **Protected Routes**: Dashboard requires authentication
- **User Context**: All operations are user-specific
- **Session Management**: Firebase handles session persistence
- **Error Handling**: Comprehensive error handling for auth operations

## Usage Examples

### Check Authentication Status
```typescript
const { user, loading } = useAuth();

if (loading) return <div>Loading...</div>;
if (!user) return <div>Please sign in with Google</div>;
```

### Sign In with Google
```typescript
const { signInWithGoogle } = useAuth();

try {
  await signInWithGoogle();
  // User is now signed in with Google
} catch (error) {
  console.error('Google sign in failed:', error);
}
```

### Sign Out User
```typescript
const { logout } = useAuth();

try {
  await logout();
  // User is now signed out
} catch (error) {
  console.error('Sign out failed:', error);
}
```

## Integration with Existing Features

- **Wallet Connection**: Now requires authentication first
- **Token Balance**: User-specific balance tracking
- **Ticket Management**: User-specific ticket operations
- **Admin Panel**: Remains accessible without authentication (as intended)

## Development

To run the application with authentication:
```bash
pnpm dev
```

The application will start on `http://localhost:8080` with full authentication integration.

## Next Steps

1. **User Profiles**: Add user profile management
2. **Role-Based Access**: Implement different user roles
3. **Data Persistence**: Store user preferences and settings
4. **Analytics**: Track user engagement and usage patterns
