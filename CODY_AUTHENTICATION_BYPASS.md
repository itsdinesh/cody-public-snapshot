# Cody Extension Authentication Bypass

This document describes the modifications made to bypass Sourcegraph authentication in the Cody extension and enable the Alt+K code editing feature.

## Overview

The Cody extension has been modified to:
1. Spoof authentication status to always appear as a logged-in Pro user
2. Bypass all feature gate checks for custom commands
3. Provide default models for code editing functionality
4. Enable the Alt+K keybinding for code edits

## Files Modified

### 1. `vscode/src/edit/edit-manager.ts`
- **Purpose**: Bypass the `customCommandsEnabled` check in the edit manager
- **Change**: Commented out the check that shows "This feature has been disabled by your Sourcegraph site admin."
- **Effect**: Allows edit tasks to be created regardless of server configuration

### 2. `lib/shared/src/sourcegraph-api/clientConfig.ts`
- **Purpose**: Always return enabled configuration for all Cody features immediately
- **Changes**: 
  - Modified `getConfig()` method to return a spoofed configuration object
  - Modified `changes` observable to immediately emit spoofed config without network requests
  - Disabled server fetching and polling mechanisms
- **Configuration returned**:
  - `chatEnabled: true`
  - `customCommandsEnabled: true` (key for Alt+K functionality)
  - `autoCompleteEnabled: true`
  - `attribution: 'permissive'`
  - `modelsAPIEnabled: true`
  - All other features enabled
- **Effect**: No loading delays or "connecting..." states, instant feature availability

### 3. `vscode/src/services/AuthProvider.ts`
- **Purpose**: Always return authenticated status immediately on startup
- **Changes**: 
  - Modified constructor to immediately emit spoofed authentication status
  - Disabled normal authentication flow subscriptions
  - Modified `refresh()` method to maintain spoofed status
  - Modified `validateAndUpdateAuthStatus()` to emit spoofed authentication
- **Spoofed user details**:
  - Username: "spoofed-user"
  - Display name: "Spoofed Pro User"
  - Email: "spoofed@example.com"
  - Always authenticated: `true`
  - Site version: "6.0.0" (modern version)
- **Effect**: Extension appears as logged in immediately without any loading delays

### 4. `vscode/src/auth/auth.ts`
- **Purpose**: Bypass actual credential validation
- **Change**: Modified `validateCredentials()` to always return authenticated status
- **Effect**: Prevents network calls to Sourcegraph servers for authentication

### 5. `vscode/src/main.ts`
- **Purpose**: Bypass command execution checks
- **Change**: Commented out `customCommandsEnabled` check in `executeCommandUnsafe()`
- **Effect**: Allows all Cody commands to execute

### 6. `vscode/src/commands/services/runner.ts`
- **Purpose**: Bypass command runner checks
- **Change**: Commented out `customCommandsEnabled` check
- **Effect**: Allows command runner to proceed without server validation

### 7. `vscode/src/commands/execute/ask.ts`
- **Purpose**: Bypass chat and command feature checks
- **Change**: Commented out both `chatEnabled` and `customCommandsEnabled` checks
- **Effect**: Allows both chat and custom commands to execute

### 8. `lib/shared/src/models/modelsService.ts`
- **Purpose**: Provide default models for code editing
- **Changes**: 
  - Modified `getDefaultEditModel()` to return "anthropic::2024-10-22::claude-3-5-sonnet-latest"
  - Modified `getDefaultChatModel()` to return the same model
- **Effect**: Ensures edit functionality has a model to work with

### 9. `lib/shared/src/models/sync.ts`
- **Purpose**: Completely bypass server-side model fetching when using authentication bypass
- **Changes**:
  - Added check for spoofed authentication (`username === 'spoofed-user'`) to skip all server-side model requests
  - Enhanced `getModelsFromVSCodeConfiguration()` to provide better logging and always return models
  - Ensured `cody.dev.models` are prioritized exclusively when configured
  - Added fallback to spoofed default model when no dev models are configured
- **Effect**: 
  - Eliminates all network requests to Sourcegraph servers for model fetching
  - Ensures models are loaded purely from `cody.dev.models` configuration
  - Prevents conflicts between server models and user-configured models
  - Provides consistent model availability regardless of server state

### 9. `lib/shared/src/sourcegraph-api/userProductSubscription.ts`
- **Purpose**: Always return Pro user subscription status
- **Change**: Modified `userProductSubscription` observable to return `{ userCanUpgrade: false }`
- **Effect**: 
  - User appears as Cody Pro instead of Free
  - `userCanUpgrade: false` indicates Pro status (cannot upgrade further)
  - Enables Pro-only features and removes upgrade prompts
  - Works with `isCodyProUser()` function that checks `!sub.userCanUpgrade`

## How It Works

1. **Immediate Authentication**: On extension startup, the AuthProvider immediately emits a spoofed authenticated status without any network requests or delays
2. **Instant Configuration**: The ClientConfigSingleton immediately returns a spoofed configuration with all features enabled, avoiding server fetches
3. **Feature Gates Removed**: All checks for `customCommandsEnabled`, `chatEnabled`, etc. are bypassed
4. **Context Setting**: The `cody.activated` VS Code context is set to `true` immediately because authentication always succeeds
5. **No Loading States**: The extension skips all normal authentication flows and network requests, appearing as instantly logged in
6. **Keybinding Activation**: Alt+K keybinding works immediately because:
   - `cody.activated` context is true from startup
   - `cody.command.edit-code` command is not blocked by feature gates
   - Default edit model is available instantly

## Alt+K Functionality

The Alt+K keybinding is configured in `vscode/package.json` as:
```json
{
  "command": "cody.command.edit-code",
  "key": "alt+k",
  "when": "cody.activated && !editorReadonly"
}
```

With the authentication bypass:
- `cody.activated` is always `true`
- The edit command bypasses all server-side restrictions
- A default model is always available for code generation

## Usage

After these modifications:
1. The extension will appear as authenticated to a Pro account
2. Alt+K will work for code editing in any file
3. No actual Sourcegraph login or server connection is required
4. The extension uses the models defined in settings or falls back to the hardcoded default

## Notes

- This bypass is for local development/testing purposes
- The extension will not actually connect to Sourcegraph servers
- All server-side features (like context from repositories) will not work
- Only local file editing with Alt+K will function
- The spoofed authentication prevents any real telemetry or usage tracking