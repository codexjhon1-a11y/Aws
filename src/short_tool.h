#ifndef SHORT_TOOL_H
#define SHORT_TOOL_H

#include "long_tool.h" // reuses the ToolResult struct

// Computes risk/reward for a Short position tool: entry, stop (above entry),
// target (below entry).
ToolResult computeShortTool(double entry, double stop, double target);

#endif
