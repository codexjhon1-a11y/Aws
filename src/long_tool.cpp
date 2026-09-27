#include "long_tool.h"

ToolResult computeLongTool(double entry, double stop, double target) {
    ToolResult r;
    r.valid = true;
    r.message = "ok";

    if (stop >= entry) {
        r.valid = false;
        r.message = "Long tool: stop must be below entry.";
    } else if (target <= entry) {
        r.valid = false;
        r.message = "Long tool: target must be above entry.";
    }

    r.riskPerUnit = entry - stop;
    r.rewardPerUnit = target - entry;
    r.riskRewardRatio = (r.riskPerUnit != 0.0) ? (r.rewardPerUnit / r.riskPerUnit) : 0.0;
    return r;
}
