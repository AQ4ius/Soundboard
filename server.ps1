param(
    [int]$Port = 8080
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$csPath = Join-Path $scriptDir "Server.cs"
Add-Type -Path $csPath

$server = New-Object SoundboardServer($scriptDir, $Port)
$server.Start()
