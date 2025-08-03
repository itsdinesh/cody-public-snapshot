> [!NOTE]
> **Personal Community Version**: This is a personal maintained version of the Cody extension with authentication bypass modifications. This version allows you to use Cody's features without requiring Sourcegraph authentication by configuring your own AI models.

> [!IMPORTANT]
> This is NOT an official Sourcegraph release. The original Cody repository transitioned to private. This repository, `sourcegraph/cody-public-snapshot` was a publicly available copy of the `sourcegraph/cody` repository as it was just before the migration, now modified for community use.

> [!TIP]
> If you are interested in the original code, this [commit](https://github.com/sourcegraph/cody-public-snapshot/commit/d7fc6741e7893e3f6e29efe58043f1afe08d505f) is the last one made under an Apache License.

---

<div align=center>

# <img src="https://storage.googleapis.com/sourcegraph-assets/cody/20230417/logomark-default.svg" width="26"> Cody

**AI coding agent with the best codebase understanding**

Cody is an AI coding agent that uses the latest LLMs and codebase context to help you understand, write, and fix code faster. 

[Docs](https://sourcegraph.com/docs/cody) • [cody.dev](https://about.sourcegraph.com/cody?utm_source=github.com&utm_medium=referral)

[![vscode extension](https://img.shields.io/vscode-marketplace/v/sourcegraph.cody-ai.svg?label=vscode%20ext)](https://marketplace.visualstudio.com/items?itemName=sourcegraph.cody-ai)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Twitter](https://img.shields.io/twitter/follow/sourcegraph.svg?label=Follow%20%40Sourcegraph&style=social)](https://twitter.com/sourcegraph)
[![Discord](https://dcbadge.vercel.app/api/server/s2qDtYGnAE?style=flat)](https://discord.gg/s2qDtYGnAE)

</div>

## Get started

**This community version requires configuring your own AI models and can be installed in two ways:**

### Option 1: Download Pre-built Release (Recommended)
1. **Download the latest `.vsix` file** from [GitHub Releases](../../releases)
2. **Install in VS Code**: 
   - Open VS Code
   - Press `Ctrl/Cmd + Shift + P` 
   - Type "Extensions: Install from VSIX"
   - Select the downloaded `.vsix` file
3. **Configure your models** (see [Model Configuration](#model-configuration) below)

### Option 2: Build from Source
1. **Build the extension**: `pnpm install && cd vscode && pnpm run dev`
2. **Configure your models** (see [Model Configuration](#model-configuration) below)
3. **Install the built extension** in VS Code from the generated `.vsix` file

> [!WARNING]
> This version does NOT work with the official marketplace versions. You must install it manually using one of the methods above.

## What is Cody?

Cody is an open-source AI coding assistant that helps you understand, write, and fix code faster. It uses advanced search to pull context from both local and remote codebases so that you can use context about APIs, symbols, and usage patterns from across your codebase at any scale, all from within your IDE. Cody works with the newest and best large language models, including the latest Claude Sonnet 4 and GPT-4o.

Cody is available for [VS Code](https://marketplace.visualstudio.com/items?itemName=sourcegraph.cody-ai), [JetBrains](https://plugins.jetbrains.com/plugin/9682-cody-ai-by-sourcegraph), and [on the web](https://sourcegraph.com/cody/chat).

See [cody.dev](https://about.sourcegraph.com/cody?utm_source=github.com&utm_medium=referral) for more info.

## What can Cody do?

- **Chat:** Ask Cody questions about your codebase using your configured AI models
- **Autocomplete:** Single-line and multi-line code suggestions as you type
- **Inline Edit (Alt+K):** Fix or refactor code from anywhere in a file
- **Prompts:** Cody has quick, customizable prompts for common actions. Simply highlight a code snippet and run a prompt, like “Document code,” “Explain code,” or “Generate Unit Tests.”
- **Custom Models:** Configure your own AI models with API keys (OpenAI, Anthropic, Google, etc.)

## Model Configuration

**This community version requires you to configure your own AI models.** Add your models to VS Code settings:

### Option 1: VS Code Settings UI
1. Open VS Code Settings (`Ctrl/Cmd + ,`)
2. Search for `cody.dev.models`
3. Click "Edit in settings.json"

### Option 2: Direct settings.json
Add to your VS Code `settings.json`:

```json
{
  "cody.dev.models": [
    {
      "provider": "openai",
      "model": "gpt-4o",
      "title": "GPT-4o",
      "apiKey": "your-openai-api-key",
      "apiEndpoint": "https://api.openai.com/v1"
    },
    {
      "provider": "anthropic", 
      "model": "claude-3-5-sonnet-20241022",
      "title": "Claude 3.5 Sonnet",
      "apiKey": "your-anthropic-api-key",
      "apiEndpoint": "https://api.anthropic.com"
    },
    {
      "provider": "google",
      "model": "gemini-2.5-flash",
      "title": "Google Gemini 2.5 Flash", 
      "apiKey": "your-google-api-key",
      "apiEndpoint": "https://generativelanguage.googleapis.com/v1beta"
    }
  ]
}
```

### Configuration Options:
- `provider`: Model provider (openai, anthropic, google, etc.)
- `model`: Model identifier 
- `title`: Display name in the UI (optional, defaults to model ID)
- `apiKey`: Your API key for the provider
- `apiEndpoint`: API endpoint URL
- `inputTokens`: Max input tokens (optional)
- `outputTokens`: Max output tokens (optional)

### Getting API Keys:
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **Google**: [aistudio.google.com](https://aistudio.google.com/app/apikey)

> [!TIP]
> If no models are configured, a default Claude 3.5 Sonnet model will be available (but won't work without proper API access).

## Demo

Cody comes with a variety of AI-for-coding features, such as autocomplete, chat, Smart Apply, generating unit tests, and more.

Here's an example of how you can combine some of these features to use Cody to work on a large codebase.

https://www.loom.com/share/ae710891c9044069a9017ee98ce657c5

## Contributing

All code in this repository is open source (Apache 2).

Quickstart: `pnpm install && pnpm build && cd vscode && pnpm run dev` to run a local build of the Cody VS Code extension.

See [development docs](doc/dev/index.md) for more.

### Feedback

Cody is often magical and sometimes frustratingly wrong. Cody's goal is to be powerful _and_ accurate. You can help:

- Use the <kbd>👍</kbd>/<kbd>👎</kbd> buttons in the chat sidebar to give feedback.
- [File an issue](https://github.com/sourcegraph/cody/issues) (or submit a PR!) when you see problems.
- [Community forum](https://community.sourcegraph.com/)
- [Discord](https://discord.gg/s2qDtYGnAE)

## Usage

### Community Version Usage

This community version works completely offline with your own API keys:

- **No Sourcegraph account required** - Authentication is bypassed
- **Bring your own models** - Configure any AI provider you have access to
- **Local operation** - No data sent to Sourcegraph servers
- **Full feature access** - All Cody features work with your configured models

### API Costs

Since you're using your own API keys, you'll be charged directly by the AI providers:
- **OpenAI**: Pay-per-use pricing for GPT models
- **Anthropic**: Pay-per-use pricing for Claude models  
- **Google**: Free tier available, then pay-per-use for Gemini models

### Official Cody

For the official Sourcegraph-hosted version with free usage tiers, visit:
- [Sourcegraph.com](https://sourcegraph.com/cody) for Cody Free/Pro
- [Cody Enterprise](https://sourcegraph.com/pricing) for business features
