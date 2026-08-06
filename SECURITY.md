# Security

> [!WARNING]
> AIStudio stores all data locally, but you should still follow good
> security practices.
> ⚠️ AI models may make mistakes, so double-check outputs.

## Reporting a Vulnerability

- **Do not** open a **public** issue for security vulnerabilities.
- Report privately to the repository maintainers (issue tracker's private
  security advisory, or the contact listed in the repository).
- Include: affected version, reproduction steps, potential impact and a
  suggested fix if possible.
- We aim to acknowledge reports within **7 days** and publish fixes as soon
  as practical.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest release | ✅ Yes |
| Any older version | ❌ No — please upgrade |

## Password Protection

The optional password is a **local privacy lock, not a security boundary**:

- **Client-side only**: the gate (`PasswordGate` component) hides the UI in
  the browser. Backend API routes have **no authentication** — anyone who can
  reach the server over the network can call `/api/*` directly and read all
  data, bypassing the lock screen entirely.
- **Storage**: the password is stored as a hash in `localStorage`; unlock
  state lives in `sessionStorage` (cleared on tab close and on hard refresh).
- **Hashing**: a simple 32-bit non-cryptographic hash, **no salt, no key
  stretching**. It must NOT be considered resistant to brute force or
  dictionary attacks.
- **No rate limiting**: there is no lockout after failed attempts.
- **Recovery**: a forgotten password can only be reset by erasing all data
  (three-step confirmation + typing "DELETE ALL").

Therefore: keep the app bound to `localhost` (or a trusted network), and rely
on OS-level access control for real protection. Do not treat the password as
defense against anyone with network or filesystem access.

## Security Best Practices

- **API keys**: stored only in your local SQLite database
  (`data/ai-studio.db`). Never share this file or commit it to version
  control (it is gitignored by default).
- **Password protection**: enable the optional lock screen in Settings to
  gate access to the app. Note it is a local convenience lock, not a
  substitute for OS-level access control.
- **Network exposure**: run the app on `localhost` unless you understand the
  risks of exposing it on a network; the API routes have no authentication
  of their own.
- **Proxy settings**: if you configure a proxy, ensure you trust it — all LLM
  traffic flows through it.
- **Dependencies**: run `npm audit` periodically and keep dependencies
  up to date.

## Data Flow

- Conversations, settings and usage statistics never leave your machine
  except when **you** send a chat request to your own configured endpoint.
- Edge-TTS requests go to Microsoft's public TTS service with the text you
  choose to read aloud.
