FROM golang:1.23-alpine

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/. .

RUN go build -o server ./cmd

EXPOSE 8080

CMD ["./server"]