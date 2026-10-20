using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Collections.Generic;

public class SoundboardServer {
    private HttpListener _listener;
    private string _rootDirectory;
    private int _port;
    private bool _running;

    private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
        { ".html", "text/html; charset=utf-8" },
        { ".css",  "text/css; charset=utf-8" },
        { ".js",   "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png",  "image/png" },
        { ".jpg",  "image/jpeg" },
        { ".svg",  "image/svg+xml" },
        { ".ico",  "image/x-icon" },
        { ".mp3",  "audio/mpeg" },
        { ".mp4",  "video/mp4" },
        { ".m4a",  "audio/mp4" },
        { ".wav",  "audio/wav" },
        { ".ogg",  "audio/ogg" },
        { ".aac",  "audio/aac" },
        { ".flac", "audio/flac" }
    };

    public SoundboardServer(string rootDir, int port) {
        _rootDirectory = Path.GetFullPath(rootDir);
        _port = port;
    }

    public void Start() {
        _listener = new HttpListener();
        string prefix = string.Format("http://localhost:{0}/", _port);
        _listener.Prefixes.Add(prefix);
        try {
            _listener.Start();
        } catch {
            _port++;
            prefix = string.Format("http://localhost:{0}/", _port);
            _listener = new HttpListener();
            _listener.Prefixes.Add(prefix);
            _listener.Start();
        }

        _running = true;
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("==========================================");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("  GRizal Stage Soundboard Server Running!");
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("  URL: " + prefix);
        Console.ForegroundColor = ConsoleColor.Gray;
        Console.WriteLine("  Native multi-threaded audio server");
        Console.WriteLine("  Press Ctrl+C to stop");
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("==========================================");
        Console.ResetColor();

        try {
            System.Diagnostics.Process.Start(prefix);
        } catch {}

        while (_running) {
            try {
                var context = _listener.GetContext();
                ThreadPool.QueueUserWorkItem(ProcessRequest, context);
            } catch {
                if (!_running) break;
            }
        }
    }

    private void ProcessRequest(object state) {
        var context = (HttpListenerContext)state;
        var request = context.Request;
        var response = context.Response;

        try {
            string rawPath = Uri.UnescapeDataString(request.Url.LocalPath);
            if (string.IsNullOrEmpty(rawPath) || rawPath == "/") {
                rawPath = "/index.html";
            }

            string relativePath = rawPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string fullPath = Path.Combine(_rootDirectory, relativePath);

            if (!File.Exists(fullPath)) {
                response.StatusCode = 404;
                byte[] notFound = System.Text.Encoding.UTF8.GetBytes("404 Not Found");
                response.ContentLength64 = notFound.Length;
                response.OutputStream.Write(notFound, 0, notFound.Length);
                return;
            }

            string ext = Path.GetExtension(fullPath);
            string mime;
            if (!MimeTypes.TryGetValue(ext, out mime)) {
                mime = "application/octet-stream";
            }

            response.ContentType = mime;
            response.AddHeader("Access-Control-Allow-Origin", "*");
            response.AddHeader("Accept-Ranges", "bytes");

            var fileInfo = new FileInfo(fullPath);
            long totalLength = fileInfo.Length;

            string rangeHeader = request.Headers["Range"];
            if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes=")) {
                string[] parts = rangeHeader.Substring(6).Split('-');
                long start = long.Parse(parts[0]);
                long end = (parts.Length > 1 && !string.IsNullOrEmpty(parts[1])) ? long.Parse(parts[1]) : (totalLength - 1);
                if (end >= totalLength) end = totalLength - 1;

                long contentLength = end - start + 1;
                response.StatusCode = 206;
                response.AddHeader("Content-Range", string.Format("bytes {0}-{1}/{2}", start, end, totalLength));
                response.ContentLength64 = contentLength;

                using (var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)) {
                    fs.Seek(start, SeekOrigin.Begin);
                    byte[] buffer = new byte[65536];
                    long remaining = contentLength;
                    while (remaining > 0) {
                        int toRead = (int)Math.Min((long)buffer.Length, remaining);
                        int read = fs.Read(buffer, 0, toRead);
                        if (read <= 0) break;
                        response.OutputStream.Write(buffer, 0, read);
                        remaining -= read;
                    }
                }
            } else {
                response.StatusCode = 200;
                response.ContentLength64 = totalLength;
                using (var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)) {
                    fs.CopyTo(response.OutputStream);
                }
            }
        } catch {
            // Client abort during stream / seek is normal
        } finally {
            try { response.Close(); } catch {}
        }
    }
}
