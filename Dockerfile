FROM debian:bookworm-slim AS build

RUN apt-get update && apt-get install -y g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY src/ src/

RUN g++ -std=c++17 -O2 -o backtester \
    src/main.cpp \
    src/data.cpp \
    src/server.cpp \
    src/long_tool.cpp \
    src/short_tool.cpp


FROM debian:bookworm-slim

WORKDIR /app

COPY --from=build /app/backtester .
COPY web/ web/
COPY data/ data/

EXPOSE 8080

CMD ["./backtester"]
