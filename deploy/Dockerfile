FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /flightdeck ./cmd/flightdeck \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /migrate ./cmd/migrate \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /reset-password ./cmd/reset-password

FROM alpine:3.22
COPY --from=build /flightdeck /usr/local/bin/flightdeck
COPY --from=build /migrate /usr/local/bin/migrate
COPY --from=build /reset-password /usr/local/bin/reset-password
EXPOSE 8080
ENTRYPOINT ["flightdeck"]
