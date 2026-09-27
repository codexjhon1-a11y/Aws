#ifndef DATA_H
#define DATA_H

#include <string>
#include <vector>

struct Candle {
    std::string time; // e.g. "2024-01-02 03:00:00"
    double open;
    double high;
    double low;
    double close;
};

// Loads a CSV file for one timeframe into outCandles.
// Auto-detects the delimiter (, ; or tab) and the column layout from the
// header row (Date/Time/DateTime/Open/High/Low/Close), falling back to a
// fixed Date,Time,Open,High,Low,Close,Volume layout if headers aren't
// recognized. Returns false if the file can't be opened or has no rows.
bool loadCandles(const std::string& csvPath, std::vector<Candle>& outCandles);

// Serializes candles to a JSON array string.
std::string candlesToJson(const std::vector<Candle>& candles);

#endif
