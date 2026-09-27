#include "server.h"
#include "data.h"
#include "long_tool.h"
#include "short_tool.h"

#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fstream>
#include <sstream>
#include <map>
#include <iostream>
#include <algorithm>
#include <vector>

namespace {

std::string readFile(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    if (!f.is_open()) return "";
    std::ostringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

std::string contentTypeFor(const std::string& path) {
    if (path.size() >= 5 && path.substr(path.size() - 5) == ".html") return "text/html";
    if (path.size() >= 4 && path.substr(path.size() - 4) == ".css") return "text/css";
    if (path.size() >= 3 && path.substr(path.size() - 3) == ".js") return "application/javascript";
    return "text/plain";
}

std::map<std::string, std::string> parseQuery(const std::string& query) {
    std::map<std::string, std::string> result;
    std::stringstream ss(query);
    std::string pair;
    while (std::getline(ss, pair, '&')) {
        size_t eq = pair.find('=');
        if (eq != std::string::npos) {
            result[pair.substr(0, eq)] = pair.substr(eq + 1);
        }
    }
    return result;
}

// Pulls "key":value out of a flat JSON object. Good enough for the fixed
// shape this app's own frontend sends (no nested objects/arrays).
std::string jsonField(const std::string& body, const std::string& key) {
    std::string pattern = "\"" + key + "\"";
    size_t pos = body.find(pattern);
    if (pos == std::string::npos) return "";
    pos = body.find(':', pos);
    if (pos == std::string::npos) return "";
    pos++;
    while (pos < body.size() && (body[pos] == ' ' || body[pos] == '\t')) pos++;
    if (pos < body.size() && body[pos] == '"') {
        size_t end = body.find('"', pos + 1);
        return body.substr(pos + 1, end - pos - 1);
    }
    size_t end = body.find_first_of(",}", pos);
    return body.substr(pos, end - pos);
}

std::string timeframeToFile(const std::string& dataRoot, const std::string& tf) {
    static const std::map<std::string, std::string> files = {
        {"5M", "XAUUSD_5M.csv"},
        {"15M", "XAUUSD_15M.csv"},
        {"30M", "XAUUSD_30M.csv"},
        {"1H", "XAUUSD_1H.csv"},
        {"4H", "XAUUSD_4H.csv"}
    };
    auto it = files.find(tf);
    if (it == files.end()) return "";
    return dataRoot + "/" + it->second;
}

void sendResponse(int clientFd, int statusCode, const std::string& statusText,
                   const std::string& contentType, const std::string& body) {
    std::ostringstream headers;
    headers << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n"
            << "Content-Type: " << contentType << "\r\n"
            << "Content-Length: " << body.size() << "\r\n"
            << "Access-Control-Allow-Origin: *\r\n"
            << "Connection: close\r\n\r\n";
    std::string headerStr = headers.str();
    send(clientFd, headerStr.c_str(), headerStr.size(), 0);
    send(clientFd, body.c_str(), body.size(), 0);
}

} // namespace

void runServer(int port, const std::string& webRoot, const std::string& dataRoot) {
    int serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "Failed to create socket\n";
        return;
    }

    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(port);

    if (bind(serverFd, (sockaddr*)&addr, sizeof(addr)) < 0) {
        std::cerr << "Failed to bind on port " << port << "\n";
        return;
    }
    if (listen(serverFd, 16) < 0) {
        std::cerr << "Failed to listen\n";
        return;
    }

    std::cout << "XAUUSD backtester server running on http://127.0.0.1:" << port << "\n";

    while (true) {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = accept(serverFd, (sockaddr*)&clientAddr, &clientLen);
        if (clientFd < 0) continue;

        std::string request;
        char buf[4096];
        ssize_t n;
        size_t headerEnd = std::string::npos;
        while ((n = recv(clientFd, buf, sizeof(buf), 0)) > 0) {
            request.append(buf, n);
            headerEnd = request.find("\r\n\r\n");
            if (headerEnd != std::string::npos) {
                size_t clPos = request.find("Content-Length:");
                size_t contentLength = 0;
                if (clPos != std::string::npos && clPos < headerEnd) {
                    contentLength = std::stoul(request.substr(clPos + 16));
                }
                size_t bodySoFar = request.size() - (headerEnd + 4);
                while (bodySoFar < contentLength &&
                       (n = recv(clientFd, buf, sizeof(buf), 0)) > 0) {
                    request.append(buf, n);
                    bodySoFar += n;
                }
                break;
            }
        }

        if (request.empty()) {
            close(clientFd);
            continue;
        }

        std::istringstream reqStream(request);
        std::string method, target, httpVersion;
        reqStream >> method >> target >> httpVersion;

        std::string path = target;
        std::string query;
        size_t qPos = target.find('?');
        if (qPos != std::string::npos) {
            path = target.substr(0, qPos);
            query = target.substr(qPos + 1);
        }

        std::string body;
        if (headerEnd != std::string::npos && request.size() > headerEnd + 4) {
            body = request.substr(headerEnd + 4);
        }

        if (method == "GET" && path == "/api/candles") {
            auto params = parseQuery(query);
            std::string tf = params.count("tf") ? params["tf"] : "";
            std::string csvPath = timeframeToFile(dataRoot, tf);
            if (csvPath.empty()) {
                sendResponse(clientFd, 400, "Bad Request", "application/json",
                             "{\"error\":\"unknown timeframe\"}");
            } else {
                std::vector<Candle> candles;
                if (!loadCandles(csvPath, candles)) {
                    sendResponse(clientFd, 404, "Not Found", "application/json",
                                 "{\"error\":\"data file not found or empty\"}");
                } else {
                    sendResponse(clientFd, 200, "OK", "application/json", candlesToJson(candles));
                }
            }
        } else if (method == "POST" && path == "/api/tool") {
            std::string type = jsonField(body, "type");
            double entry = 0, stop = 0, target_ = 0;
            try {
                entry = std::stod(jsonField(body, "entry"));
                stop = std::stod(jsonField(body, "stop"));
                target_ = std::stod(jsonField(body, "target"));
            } catch (...) {}

            ToolResult result = (type == "short")
                ? computeShortTool(entry, stop, target_)
                : computeLongTool(entry, stop, target_);

            std::ostringstream json;
            json << "{\"valid\":" << (result.valid ? "true" : "false")
                 << ",\"message\":\"" << result.message << "\""
                 << ",\"risk\":" << result.riskPerUnit
                 << ",\"reward\":" << result.rewardPerUnit
                 << ",\"riskRewardRatio\":" << result.riskRewardRatio << "}";
            sendResponse(clientFd, 200, "OK", "application/json", json.str());
        } else {
            std::string filePath = webRoot + (path == "/" ? "/index.html" : path);
            std::string content = readFile(filePath);
            if (content.empty()) {
                sendResponse(clientFd, 404, "Not Found", "text/plain", "404 Not Found");
            } else {
                sendResponse(clientFd, 200, "OK", contentTypeFor(filePath), content);
            }
        }

        close(clientFd);
    }

    close(serverFd);
}
