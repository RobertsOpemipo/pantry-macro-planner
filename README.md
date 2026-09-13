# Pantry Macro Planner

A full-stack mobile application and backend service designed to track pantry inventory, calculate macro targets, and manage meal planning.

## Project Structure

```text
pantry-macro-planner/
├── apps/
│   └── api/             # Go REST API backend (Fiber/Gin + GORM/Sqlx)
│       ├── cmd/api/     # Application entrypoint (main.go)
│       └── internal/    # Private application code and business logic
├── mobile/              # React Native / Expo mobile application frontend
├── docker-compose.yml   # Container orchestration for PostgreSQL and Go API
└── README.md

Tech Stack
Backend: Go (Golang), PostgreSQL, Docker

Frontend: React Native, Expo, TypeScript, Tailwind CSS (NativeWind)

Prerequisites
Ensure you have the following installed on your machine:

Docker Desktop

Go (v1.23+ माणसा)

Node.js & npm

Expo CLI