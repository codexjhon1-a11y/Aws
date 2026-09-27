#include "server.h"
#include <string>

int main() {
    const int port = 8080;
    const std::string webRoot = "web";
    const std::string dataRoot = "data";
    runServer(port, webRoot, dataRoot);
    return 0;
}
