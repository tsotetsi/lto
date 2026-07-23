<div align="center">
  <img src="/assets/lethathamo-logo.png" alt="lethathamo logo" width="250" height="250">
  <!-- <h1>📄 Add an actual application logo here.</h1> -->
  <p><strong>Craft your career documents in style with XeLaTeX</strong></p>
</div>

<div align="center">

[![Status](https://img.shields.io/badge/status-active-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

</div>

<p align="center">
  A full-stack LaTeX resume &amp; cover letter builder with a live split-pane editor,
  real-time PDF preview, template gallery, and theme support.
  <br />
  <a href="./DEVELOPMENT.md"><strong>📖 Development Guide »</strong></a>
</p>

---

## ✨ Features

- **Live Split-Pane Editor** — Write LaTeX on the left, see the compiled PDF preview on the right
- **Monaco Code Editor** — Syntax highlighting, multi-cursor, and familiar VS Code keybindings
- **Real-Time PDF Compilation** — Powered by XeLaTeX with TrueType font support (Times New Roman, Fontin, Liberation Sans)
- **Template Gallery** — Choose from professionally designed templates (Modern Professional, Executive, Classic, Startup, Academic, Cover Letter)
- **Variable Injection** — Fill in template variables through a simple form UI and generate personalized documents
- **Resume Snippets** — Save & reuse content blocks via PostgreSQL (optional)
- **Theme Toggle** — Light & dark mode with persistent preference (localStorage)
- **Drag-to-Resize Panels** — Collapsible editor/preview with adjustable split ratio
- **Hot Reload** — Edit code on your host, see changes instantly in the Docker container
- **Observability** — Loki + Grafana + Alloy for centralized logging (optional)

## 🖼️ Screenshot

> *Replace this with a screenshot once you have the app running:*
> 
> ```
> ┌──────────────────────┬──────────────────────┐
> │                      │                      │
> │   LaTeX Editor       │   PDF Preview        │
> │   (Monaco)           │                      │
> │                      │                      │
> │   \documentclass{..} │   [Compiled PDF]     │
> │                      │                      │
> ├──────────────────────┴──────────────────────┤
> │   Terminal output / error log               │
> └─────────────────────────────────────────────┘
> ```

## 🚀 Quick Start

**Prerequisites:** Docker 24+ and Docker Compose v2.

```bash
# 1. Clone the repo
git clone <repo-url>
cd lto

# 2. Generate secrets and config
make setup

# 3. Build and start everything
make dev-up
```

Once ready, open **http://localhost:3000** and start editing.

> 📖 **Full development workflow, troubleshooting, and architecture docs are in [DEVELOPMENT.md](./DEVELOPMENT.md).**

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, React, Tailwind CSS v4 |
| **Editor** | Monaco Editor (VS Code's editor) |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (async) |
| **Compiler** | XeLaTeX (TrueType/OpenType font support) |
| **Database** | PostgreSQL 16 |
| **Logging** | Loki + Grafana + Alloy |
| **Containerization** | Docker, Docker Compose |

## 🗂️ Project Structure

```
lto/
├── backend/                 # FastAPI application
│   ├── main.py              # Routes, middleware, health check
│   ├── config.py            # Pydantic settings + Docker secrets
│   ├── database.py          # SQLAlchemy async engine
│   ├── managers.py          # Template loading + defaults
│   ├── services.py          # LaTeX compilation logic
│   ├── templates/           # Template definitions (JSON + LaTeX)
│   ├── resumes/             # Resume snippet CRUD module
│   ├── fonts/               # Custom Fontin typeface
│   └── migrations/          # Alembic database migrations
├── frontend/                # Next.js application
│   ├── src/app/             # Pages & routing
│   │   ├── page.tsx         # Main split-pane editor
│   │   ├── template/        # Template gallery page
│   │   ├── components/      # UI components (SplitPane, ThemeToggle, etc.)
│   │   └── context/         # React context providers (ThemeContext)
│   └── Dockerfile           # Multi-stage build (dev + runner)
├── storage/postgres/        # PostgreSQL config + init scripts
├── monitoring/              # Loki, Grafana, Alloy configuration
├── docker-compose.yml       # Service orchestration
└── DEVELOPMENT.md           # Full development guide
```

## 🧩 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/templates` | List all available templates |
| `GET` | `/templates/{id}` | Get a single template with its variables |
| `POST` | `/compile/raw` | Compile raw LaTeX to PDF (custom font) |
| `POST` | `/templates/compile` | Fill template variables and compile to PDF |

See [backend/main.py](./backend/main.py) for full API details.

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for the dev workflow
2. Fork the repo and create a feature branch
3. Make your changes (hot reload picks them up automatically)
4. Open a pull request

### Ideas for contributions

- Add more LaTeX templates (creative, modern, minimal)
- Improve PDF preview with pagination or zoom controls
- Add export formats (DOCX, HTML via Pandoc)
- User authentication and saved projects
- Drag-and-drop section reordering in the editor

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <sub>Built with ☕ and XeLaTeX</sub>
</div>
