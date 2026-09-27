#ifndef SERVER_H
#define SERVER_H

#include <string>

// Starts a blocking HTTP server on the given port.
// webRoot: directory containing index.html/style.css/app.js
// dataRoot: directory containing the per-timeframe CSV files
void runServer(int port, const std::string& webRoot, const std::string& dataRoot);

#endif
