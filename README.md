# gritcode

A real-time competitive coding platform. Solve Java problems solo or compete against others in timed team battles.

![forge](docs/screenshot-forge.png)

![lobby](docs/screenshot-lobby.png)

---

## Features

- **Forge** — browse 22 coding problems (Easy / Medium / Hard), read descriptions, filter by tag and difficulty, attempt problems in a Java editor with live test execution
- **Practice** — solve problems individually, see pass/fail output, earn XP on first solve
- **Multiplayer** — host or join a room with an invite code, compete in teams against a timer, real-time scoreboard via WebSocket
- **Profiles** — XP, level badge, submission history, follow other users
- **Dark / light theme**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, Monaco Editor, STOMP/SockJS |
| Backend | Spring Boot, GraphQL (spring-graphql), JPA/Hibernate |
| Database | PostgreSQL |
| Code execution | Docker (isolated Java sandbox) |
| Auth | JWT |

---

## Local development

### Prerequisites

- Java 21
- Node 18+
- PostgreSQL
- Docker

### 1. Database

```bash
psql -U postgres
CREATE DATABASE coding_platform;
\q
```

### 2. Environment variables

```bash
export DB_URL=jdbc:postgresql://localhost:5432/coding_platform
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export JWT_SECRET=$(openssl rand -base64 32)
export APP_ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Docker sandbox image

```bash
cd backend
docker build -t java-test-runner:latest .
```

### 4. Run backend

```bash
cd backend
./mvnw spring-boot:run
```

### 5. Run frontend

```bash
cd frontend
cp .env.example .env        # or create .env with VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Frontend environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | Backend base URL |

---

## Backend environment variables

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/coding_platform` | JDBC connection string |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | *(required)* | Database password |
| `JWT_SECRET` | *(required)* | Secret for signing JWTs |
| `APP_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins |

---

## Deployment

The `deploy/` directory (gitignored) contains two scripts:

- **`deploy/setup`** — provisions a new Azure VM, installs dependencies, builds and uploads the app, configures Nginx + Let's Encrypt HTTPS, creates a systemd service
- **`deploy/deploy`** — rebuilds frontend + backend and redeploys to an existing VM

Live instance: [https://gritcode.polandcentral.cloudapp.azure.com](https://gritcode.polandcentral.cloudapp.azure.com)
