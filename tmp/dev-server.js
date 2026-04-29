const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2]) || 5500;
const host = "127.0.0.1";
const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml; charset=utf-8",
    ".pdf": "application/pdf",
};

const server = http.createServer((request, response) => {
    const urlPath = decodeURIComponent(request.url.split("?")[0]);
    const safePath = path.normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^[/\\]+/, "");
    const filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        response.writeHead(200, {
            "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        });
        response.end(data);
    });
});

server.listen(port, host, () => {
    console.log(`Servidor local em http://${host}:${port}/`);
});
