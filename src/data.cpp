#include "data.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace {

std::string trim(const std::string& s) {
    size_t start = s.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    size_t end = s.find_last_not_of(" \t\r\n");
    return s.substr(start, end - start + 1);
}

std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return s;
}

char detectDelimiter(const std::string& headerLine) {
    if (headerLine.find(';') != std::string::npos) return ';';
    if (headerLine.find('\t') != std::string::npos) return '\t';
    return ',';
}

std::vector<std::string> splitLine(const std::string& line, char delim) {
    std::vector<std::string> fields;
    std::stringstream ss(line);
    std::string field;
    while (std::getline(ss, field, delim)) {
        fields.push_back(trim(field));
    }
    return fields;
}

} // namespace

bool loadCandles(const std::string& csvPath, std::vector<Candle>& outCandles) {
    std::ifstream file(csvPath);
    if (!file.is_open()) return false;

    outCandles.clear();

    std::string headerLine;
    if (!std::getline(file, headerLine)) return false;
    char delim = detectDelimiter(headerLine);
    std::vector<std::string> headers = splitLine(headerLine, delim);

    int dateIdx = -1, timeIdx = -1, dateTimeIdx = -1;
    int openIdx = -1, highIdx = -1, lowIdx = -1, closeIdx = -1;

    for (size_t i = 0; i < headers.size(); ++i) {
        std::string h = toLower(headers[i]);
        if (h == "date") dateIdx = (int)i;
        else if (h == "time") timeIdx = (int)i;
        else if (h == "datetime" || h == "date_time" || h == "timestamp") dateTimeIdx = (int)i;
        else if (h == "open") openIdx = (int)i;
        else if (h == "high") highIdx = (int)i;
        else if (h == "low") lowIdx = (int)i;
        else if (h == "close") closeIdx = (int)i;
    }

    // If the "header" row is actually numeric data (no header row present),
    // fall back to a fixed layout and treat this row as the first candle.
    bool headerLooksNumeric = !headers.empty() && !headers[0].empty() &&
        (std::isdigit((unsigned char)headers[0][0]) || headers[0][0] == '.');

    std::vector<std::string> firstDataRow;
    if (headerLooksNumeric) {
        firstDataRow = headers;
    }

    if (openIdx == -1 || highIdx == -1 || lowIdx == -1 || closeIdx == -1) {
        dateIdx = 0; timeIdx = 1; openIdx = 2; highIdx = 3; lowIdx = 4; closeIdx = 5;
        dateTimeIdx = -1;
    }

    auto parseRow = [&](const std::vector<std::string>& f) -> bool {
        int maxIdx = std::max(std::max(openIdx, highIdx), std::max(lowIdx, closeIdx));
        if (maxIdx < 0 || (size_t)maxIdx >= f.size()) return false;

        Candle c;
        if (dateTimeIdx != -1 && (size_t)dateTimeIdx < f.size()) {
            c.time = f[dateTimeIdx];
        } else if (dateIdx != -1 && timeIdx != -1 &&
                   (size_t)dateIdx < f.size() && (size_t)timeIdx < f.size()) {
            c.time = f[dateIdx] + " " + f[timeIdx];
        } else if (dateIdx != -1 && (size_t)dateIdx < f.size()) {
            c.time = f[dateIdx];
        } else {
            c.time = "";
        }

        try {
            c.open  = std::stod(f[openIdx]);
            c.high  = std::stod(f[highIdx]);
            c.low   = std::stod(f[lowIdx]);
            c.close = std::stod(f[closeIdx]);
        } catch (...) {
            return false;
        }
        outCandles.push_back(c);
        return true;
    };

    if (headerLooksNumeric) {
        parseRow(firstDataRow);
    }

    std::string line;
    while (std::getline(file, line)) {
        if (trim(line).empty()) continue;
        parseRow(splitLine(line, delim));
    }

    return !outCandles.empty();
}

std::string candlesToJson(const std::vector<Candle>& candles) {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < candles.size(); ++i) {
        const Candle& c = candles[i];
        if (i) oss << ",";
        oss << "{\"time\":\"" << c.time << "\","
            << "\"open\":" << c.open << ","
            << "\"high\":" << c.high << ","
            << "\"low\":" << c.low << ","
            << "\"close\":" << c.close << "}";
    }
    oss << "]";
    return oss.str();
}
