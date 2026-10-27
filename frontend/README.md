# Frontend — Taskfort Operations Hub

The frontend is a React 18 single-page application built with Vite, Tailwind CSS, TanStack Query, and React Router v6.

## Directory Structure

```text
frontend/
├── public/                 # Static assets (including legacy styles & scripts)
├── src/
│   ├── api/                # API client adapters
│   ├── components/         # Reusable UI components (Navbar, Sidebar, StatusBadge, ConflictModal, etc.)
│   ├── context/            # React context providers (AuthContext, Persona Switcher)
│   ├── pages/              # Views (Dashboard, WorkItems, Detail, Create, Approvals, SimulationLab, etc.)
│   ├── services/           # Service layer with Axios HTTP client and Idempotency key generators
│   ├── styles/             # Stylesheets and theme configurations
│   ├── App.jsx             # Main router and layout
│   ├── index.css           # Tailwind CSS stylesheet
│   └── main.jsx            # Application entrypoint
├── package.json            # Frontend dependencies and scripts
├── vite.config.js          # Vite configuration with API reverse proxy
├── tailwind.config.js      # Tailwind CSS configuration
└── .env.example            # Environment variables template
```

## Running the Frontend

From the repository root:
```bash
npm run dev --workspace=frontend
```

Or from the `frontend/` directory:
```bash
npm install
npm run dev
```

The development server starts at `http://localhost:3000` and automatically proxies `/api` requests to the backend server at `http://localhost:5000`.

## Building for Production

```bash
npm run build
```
Compiled production bundles are output to `frontend/dist/`.
