# 🗺️ Campus Navigator (CS313 Project)

## 📖 Description
Campus Navigator is a web-based campus navigation system built with a microservices architecture. It is designed to help users navigate campus facilities efficiently. This project utilizes a combination of **Go** for high-performance backend logic, **Node.js** for API handling, and **PHP** for the frontend interface, all containerized with **Docker** and automated via **GitLab CI/CD**.

---

## 🏗️ Project Structure


This repository is organized into microservices and infrastructure configurations:

* `go-app/`: Go microservice for backend logic and database interactions.
* `node-app/`: Node.js application handling specific API requests and real-time features.
* `php-app/`: Main frontend and server-side logic served via Apache/PHP.
* `db_init/`: SQL scripts for initializing the database (GraphDB/MySQL).
* `compose.yaml`: Docker Compose configuration to orchestrate services.

---

## 🚀 Configuration & Setup
Follow these instructions to get the project running on your local machine.

### 1. Prerequisites
Ensure the following are installed on your machine:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine & Docker Compose)
* [Git](https://git-scm.com/)

### 2. Clone the Repository
Open your terminal and run:
```bash
git clone [https://github.com/2241812/WebDev_Campus-Navigator_CS312.git](https://github.com/2241812/WebDev_Campus-Navigator_CS312.git)
cd WebDev_Campus-Navigator_CS312
