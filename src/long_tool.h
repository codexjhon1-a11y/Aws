#ifndef LONG_TOOL_H
#define LONG_TOOL_H

#include <string>

struct ToolResult {
    double riskPerUnit;
    double rewardPerUnit;
    double riskRewardRatio;
    bool valid;
    std::string message;
};

// Computes risk/reward for a Long position tool: entry, stop (below entry),
// target (above entry).
ToolResult computeLongTool(double entry, double stop, double target);

#endif
