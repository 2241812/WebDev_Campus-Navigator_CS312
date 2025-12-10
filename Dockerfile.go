FROM golang:1.21-alpine

WORKDIR /app

# Initialize module and fetch driver automatically
RUN go mod init campus-navigator-go || true
RUN go get github.com/go-sql-driver/mysql

# Copy code
COPY go-app/main.go .

# Run
CMD ["go", "run", "main.go"]