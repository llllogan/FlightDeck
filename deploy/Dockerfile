FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /flightdeck ./cmd/flightdeck

FROM alpine:3.22
COPY --from=build /flightdeck /usr/local/bin/flightdeck
EXPOSE 8080
ENTRYPOINT ["flightdeck"]
