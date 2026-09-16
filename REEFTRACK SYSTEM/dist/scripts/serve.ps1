param([int]$Port = 8080)

$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$buildRoot = [System.IO.Path]::GetFullPath((Join-Path $sourceRoot "dist"))
if (-not (Test-Path -LiteralPath (Join-Path $buildRoot "index.html") -PathType Leaf)) {
    throw "Production build not found. Run 'npm run build' before starting this server."
}
$projectRoot = $buildRoot
$server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"
    ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
    ".gif" = "image/gif"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"; ".webp" = "image/webp"
}

try {
    try {
        $server.Start()
    } catch [System.Net.Sockets.SocketException] {
        # A previous F5 session can leave the project server alive. Reuse the
        # listener so launching another browser window does not fail.
        Write-Output "ReefTrack server ready at http://localhost:$Port/ (already running)"
        exit 0
    }
    Write-Output "ReefTrack server ready at http://localhost:$Port/ (serving $projectRoot)"
    while ($true) {
        $client = $server.AcceptTcpClient()
        try {
            # Do not let an incomplete browser/preload connection block every
            # later request or keep the port stuck indefinitely.
            $client.ReceiveTimeout = 3000
            $client.SendTimeout = 3000
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while ($reader.ReadLine()) { }
            $requestTarget = ($requestLine -split " ")[1]
            $relativePath = [Uri]::UnescapeDataString((($requestTarget -split "\?")[0]).TrimStart("/"))
            if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }
            $requestedPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relativePath))
            $status = "200 OK"; $contentType = "text/plain; charset=utf-8"; $body = [byte[]]::new(0)
            if (-not $requestedPath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $status = "403 Forbidden"; $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
            } elseif (Test-Path -LiteralPath $requestedPath -PathType Leaf) {
                $extension = [System.IO.Path]::GetExtension($requestedPath).ToLowerInvariant()
                $contentType = $mimeTypes[$extension]
                if (-not $contentType) { $contentType = "application/octet-stream" }
                $body = [System.IO.File]::ReadAllBytes($requestedPath)
            } elseif ([string]::IsNullOrWhiteSpace([System.IO.Path]::GetExtension($relativePath)) -and (Test-Path -LiteralPath (Join-Path $projectRoot "index.html") -PathType Leaf)) {
                # React Router handles clean client-side routes such as /login and /signup.
                $contentType = "text/html; charset=utf-8"
                $body = [System.IO.File]::ReadAllBytes((Join-Path $projectRoot "index.html"))
            } else {
                $status = "404 Not Found"; $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($body, 0, $body.Length)
            $stream.Flush()
        } catch {
            # Ignore an abandoned request and continue serving new windows.
        } finally { $client.Close() }
    }
} finally { $server.Stop() }
