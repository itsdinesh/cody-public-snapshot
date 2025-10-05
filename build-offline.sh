#!/bin/bash

# Build script for Cody No-Login Extension
# This script builds the extension with Sourcegraph login requirement removed

set -e

echo "🚀 Building Cody No-Login Extension..."

# Check if required tools are installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed. Please install pnpm first."
    echo "   npm install -g pnpm"
    exit 1
fi

if ! command -v vsce &> /dev/null; then
    echo "❌ vsce is required but not installed. Installing..."
    npm install -g @vscode/vsce
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the shared library
echo "🔧 Building shared library..."
pnpm build

# Build the VSCode extension
echo "🔧 Building VSCode extension..."
cd vscode

# Install VSCode extension dependencies
pnpm install

# Build the extension
pnpm run build

# Package the extension
echo "📦 Packaging extension..."
vsce package --no-dependencies --out ../cody-no-login.vsix

cd ..

echo "✅ Build complete!"
echo ""
echo "📁 Extension package: cody-no-login.vsix"
echo ""
echo "🎯 To install:"
echo "   1. Open VS Code"
echo "   2. Go to Extensions (Ctrl+Shift+X)"
echo "   3. Click '...' menu → 'Install from VSIX...'"
echo "   4. Select cody-no-login.vsix"
echo ""
echo "🔧 To configure with your API keys:"
echo "   1. Open VS Code Settings (Ctrl+,)"
echo "   2. Search for 'cody.dev.models'"
echo "   3. Add your configuration like:"
echo '   "cody.dev.models": [{'
echo '     "provider": "openai",'
echo '     "model": "gpt-4",'
echo '     "apiKey": "your-api-key-here"'
echo '   }]'
echo ""
echo "🎉 No Sourcegraph login required - use your own API keys!"
