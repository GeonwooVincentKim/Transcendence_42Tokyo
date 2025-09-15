# Simple WebSocket test using .NET WebSocket
Add-Type -AssemblyName System.Net.WebSockets

$uri = "ws://localhost:8000/ws/game/24/1"
$webSocket = New-Object System.Net.WebSockets.ClientWebSocket

try {
    Write-Host "Connecting to: $uri"
    $task = $webSocket.ConnectAsync([System.Uri]$uri, $null)
    $task.Wait()
    
    if ($webSocket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        Write-Host "✅ WebSocket connection successful!"
    } else {
        Write-Host "❌ WebSocket connection failed. State: $($webSocket.State)"
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
} finally {
    if ($webSocket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $webSocket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Test completed", $null).Wait()
    }
    $webSocket.Dispose()
}
