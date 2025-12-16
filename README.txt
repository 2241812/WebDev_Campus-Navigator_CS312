CAMPUS NAVIGATOR (CS313 PROJECT)
================================================================================

DESCRIPTION
-----------
Campus Navigator is a web-based campus navigation system built with a 
microservices architecture. It is designed to help users navigate campus 
facilities efficiently. This project utilizes a combination of Go for 
high-performance backend logic, Node.js for API handling, and PHP for the 
frontend interface, all containerized with Docker and automated via GitLab CI/CD.


PROJECT STRUCTURE
-----------------
This repository is organized into microservices and infrastructure configurations:

* go-app/       : Go microservice for backend logic and database interactions.
* node-app/     : Node.js application handling specific API requests/real-time features.
* php-app/      : Main frontend and server-side logic served via Apache/PHP.
* db_init/      : SQL scripts for initializing the database (GraphDB/MySQL).
* compose.yaml  : Docker Compose configuration to orchestrate services.


CONFIGURATION & SETUP
----------------------------------------------------------------================
Follow these instructions to get the project running on your local machine.

1. PREREQUISITES
   Ensure the following are installed on your machine:
   - Docker Desktop (or Docker Engine & Docker Compose)
   - Git

2. CLONE THE REPOSITORY
   Open your terminal and run:
   
   git clone https://github.com/2241812/WebDev_Campus-Navigator_CS312.git
   cd WebDev_Campus-Navigator_CS312

3. START THE APPLICATION
   Build the containers and start the services using Docker Compose:

   docker compose up --build

   Note: This command builds the PHP, Go, and Node images and initializes the 
   database network.


USAGE
-----
Once the containers are running, access the application via your browser:

* Frontend (PHP): http://localhost:80 
  (Or the port defined in compose.yaml)

* Node Service:   http://localhost:3000

* Go Service:     Check your specific port configuration in compose.yaml


CI/CD PIPELINES
---------------
This repository uses GitLab CI/CD to automate testing, building, and reporting.

1. AUTOMATED PDF DOCUMENTATION
   - Trigger: Every code push.
   - Output: "Project_Artifacts.pdf" (compiles source code and config).
   - Access: Go to GitLab > Build > Artifacts > generate_pdf_artifacts.

2. DOCKER BUILDS & VERIFICATION
   - Trigger: Pipeline execution.
   - Action: Builds images for php-app, go-app, and node-app.
   - Verification: Build logs (e.g., php-build-log.txt) are saved as artifacts.

3. RELEASE
   - Action: Successful builds are tagged as 'latest' and released.


TECH STACK
----------
* Frontend: HTML5, CSS3, JavaScript
* Backend:  PHP 8.2, Go 1.23, Node.js
* Database: MySQL / GraphDB
* DevOps:   Docker, GitLab CI, Pandoc


ROADMAP
-------
[ ] Integration of real-time map data.
[ ] User authentication and role management.
[ ] Advanced pathfinding algorithms in the Go microservice.


CONTRIBUTING
------------
1. Create a new branch: git checkout -b feature/AmazingFeature
2. Commit your changes: git commit -m 'Add some AmazingFeature'
3. Push to the branch:  git push origin feature/AmazingFeature
4. Open a Merge Request in GitLab.


AUTHORS AND ACKNOWLEDGMENT
--------------------------
* CS313 - Bravo's Compass: Initial work and development
* Faculty Advisor: Britanny Baldovino


LICENSE
-------
This project is created for educational purposes under the CS313 course.


PROJECT STATUS
--------------
Active Development (2025-2026 Term 1)