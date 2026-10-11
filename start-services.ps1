$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-Port($port) {
  $connection = Test-NetConnection -ComputerName '127.0.0.1' -Port $port -WarningAction SilentlyContinue
  return $connection.TcpTestSucceeded
}

function Test-DatabaseEndpoint($hostName, $port) {
  $connection = Test-NetConnection -ComputerName $hostName -Port $port -WarningAction SilentlyContinue
  return $connection.TcpTestSucceeded
}

function Find-FreePort($preferredPort, $excludedPorts) {
  if ($excludedPorts -notcontains $preferredPort -and -not (Test-Port $preferredPort)) {
    return $preferredPort
  }

  foreach ($candidate in 8083..8099) {
    if ($excludedPorts -notcontains $candidate -and -not (Test-Port $candidate)) {
      return $candidate
    }
  }

  return $null
}

if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
  Write-Host 'Maven was not found. Install Maven and add mvn to PATH, or run each module from Eclipse.' -ForegroundColor Red
  exit 1
}

if ($env:APP_DB_URL) {
  if ($env:APP_DB_URL -notmatch '^jdbc:postgresql://(?<host>\[[^\]]+\]|[^/:?]+)(:(?<port>\d+))?/') {
    Write-Host 'APP_DB_URL must use jdbc:postgresql://host[:port]/database format.' -ForegroundColor Red
    exit 1
  }
  $databaseHost = $Matches.host.Trim('[', ']')
  $databasePort = if ($Matches.port) { [int]$Matches.port } else { 5432 }
  if (-not (Test-DatabaseEndpoint $databaseHost $databasePort)) {
    Write-Host "PostgreSQL is not responding on ${databaseHost}:$databasePort. Check APP_DB_URL and start PostgreSQL." -ForegroundColor Red
    exit 1
  }
} else {
  $databaseHost = 'localhost'
  if (Test-Port 5432) {
    $databasePort = 5432
  } elseif (Test-Port 5434) {
    $databasePort = 5434
  } else {
    Write-Host 'PostgreSQL is not responding on localhost:5432 or localhost:5434. Start PostgreSQL and create assignmentdb first.' -ForegroundColor Red
    Write-Host 'Use setup-database.sql in pgAdmin. No Docker is required.'
    exit 1
  }
  $env:APP_DB_URL = "jdbc:postgresql://${databaseHost}:$databasePort/assignmentdb"
}
Write-Host "Using PostgreSQL at ${databaseHost}:$databasePort" -ForegroundColor Green

if (Test-Port 8080) {
  Write-Host 'Port 8080 is already in use. Stop the existing API Gateway before starting the platform.' -ForegroundColor Red
  exit 1
}

$authPort = Find-FreePort 8081 @()
$userPort = Find-FreePort 8082 @($authPort)
if (-not $authPort -or -not $userPort) {
  Write-Host 'No free service ports are available in 8081-8099.' -ForegroundColor Red
  exit 1
}

$modules = @(
  @{ Name = "Auth Service ($authPort)"; Path = 'auth-service'; Port = $authPort },
  @{ Name = "User Service ($userPort)"; Path = 'user-service'; Port = $userPort },
  @{ Name = 'API Gateway (8080)'; Path = 'api-gateway'; Port = 8080 }
)
foreach ($module in $modules) {
  $path = Join-Path $root $module.Path
  $quotedPath = $path.Replace("'", "''")
  $quotedDatabaseUrl = $env:APP_DB_URL.Replace("'", "''")
  $command = "`$env:SERVER_PORT='$($module.Port)'; `$env:APP_DB_URL='$quotedDatabaseUrl'; Set-Location '$quotedPath'; "
  if ($module.Path -eq 'api-gateway') {
    $command += "`$env:AUTH_SERVICE_URL='http://localhost:$authPort'; `$env:USER_SERVICE_URL='http://localhost:$userPort'; "
  }
  $command += 'mvn spring-boot:run'
  Start-Process powershell -ArgumentList '-NoExit','-Command',$command
  Start-Sleep -Seconds 3
  Write-Host "Started terminal for $($module.Name)" -ForegroundColor Green
}
Write-Host 'Wait for all three services to finish starting, then run the frontend.' -ForegroundColor Cyan
Write-Host 'Frontend: cd frontend; npm install; npm run dev'
Write-Host 'Open the local URL printed by Vite (do not open index.html directly).'
