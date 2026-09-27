#include "short_tool.h"

ToolResult computeShortTool(double entry, double stop, double target) {
    ToolResult r;
    r.valid = true;
    r.message = "ok";

    if (stop <= entry) {
        r.valid = false;
        r.message = "Short tool: stop must be above entry.";
    } else if (target >= entry) {
        r.valid = false;
        r.message = "Short tool: target must be below entry.";
    }

    r.riskPerUnit = stop - entry;
    r.rewardPerUnit = entry - target;
    r.riskRewardRatio = (r.riskPerUnit != 0.0) ? (r.rewardPerUnit / r.riskPerUnit) : 0.0;
    return r;
}
