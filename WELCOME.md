# Welcome to AI Studio

AI Studio is a self-hosted playground for conversing with large language
models through any Gemini or OpenAI-compatible endpoint. All conversations,
settings and usage statistics are stored in a **local SQLite database** — your
data stays on your machine.

## Table of Contents

- [README](README.md) — Project overview, features, quick start, screenshots.
- [LICENSE](LICENSE.md) — Terms of use and distribution.
- [Development Guide](DEVELOPMENT.md) — Architecture, backend API reference, extension guide.
- [Security](SECURITY.md) — Vulnerability reporting and responsible disclosure.
- [Contributing](CONTRIBUTING.md) — How to contribute, PR workflow, coding style.
- [Code of Conduct](CODE_OF_CONDUCT.md) — Community standards and expectations.
- [Disclaimer](DISCLAIMER.md) — Relationship with Google AI Studio and legal notices.

## What Makes This Project Different

- 🗄️ **Local-first storage** — embedded libsql (SQLite) database, no cloud dependency.
- 🗣️ **Edge-TTS voice** — multiple voices with volume / rate / pitch control and auto-read mode.
- 🔒 **Password protection** — optional lock screen guarding the whole app.
- 🌗 **Dark / light / system themes** — flicker-free, applied before hydration.
- 🔌 **Bring your own endpoint** — custom Base URL, API key, protocol and proxy.
- 🧠 **Long-term memory (RAG)** — messages trimmed out of the context window
  are still retrievable via semantic search; works fully on-device with the
  Local embedding provider, no embedding channel required.
- 🧰 **Full tool suite** — structured outputs, function calling, code execution,
  Search / Maps grounding and URL context.

## Getting Started

1. Run `npm install` and `npm run dev`, then open <http://localhost:3000>.
2. Open **Settings** at the bottom-left → API configuration: enter Base URL,
   API key, protocol and optional proxy.
3. Pick a model in the run settings panel and start chatting.
4. Explore **Dashboard** for database stats and **History** for past chats.

## Where to Go Next

- New to the codebase? Read the [Development Guide](DEVELOPMENT.md).
- Want to help? See [Contributing](CONTRIBUTING.md) and the
  [Code of Conduct](CODE_OF_CONDUCT.md).
- Found a vulnerability? Check [Security](SECURITY.md).
