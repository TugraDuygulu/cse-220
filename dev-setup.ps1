$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $rootDir

function Write-Step {
    param([int]$Step, [int]$Total, [string]$Message)
    Write-Host "[$Step/$Total] $Message"
}

function Test-Command {
    param([string]$Name)
    Get-Command $Name -ErrorAction SilentlyContinue
}

function Install-Poetry-Windows {
    Write-Host "Installing Poetry via pipx..." -ForegroundColor Yellow
    if (Get-Command pipx -ErrorAction SilentlyContinue) {
        pipx install poetry
    } elseif (Get-Command pip -ErrorAction SilentlyContinue) {
        pip install poetry
    } else {
        return $false
    }
    return $true
}

function Install-Npm-Deps {
    Write-Step 1 5 "Installing Node dependencies..."
    npm install
}

function Install-Poetry-Deps {
    param([string]$Project, [string]$StepName)

    $projectDir = if ($Project) { "$rootDir/$Project" } else { $rootDir }

    if (-not (Test-Path "$projectDir/pyproject.toml")) {
        Write-Host "Skipping $StepName - pyproject.toml not found" -ForegroundColor Gray
        return
    }

    Push-Location $projectDir
    try {
        Write-Step $Step "Installing $StepName Python dependencies..."
        if (Get-Command poetry -ErrorAction SilentlyContinue) {
            $env:POETRY_KEYRING_ENABLED = 'false'
            poetry install --no-interaction
        } else {
            if (Test-Path "requirements.txt") {
                pip install -r requirements.txt
            } else {
                Write-Host "Warning: poetry not found and no requirements.txt" -ForegroundColor Yellow
            }
        }
    }
    finally {
        Pop-Location
    }
}

try {
    $env:POETRY_KEYRING_ENABLED = 'false'

    if (-not (Test-Command "npm")) {
        throw "npm is required. Install Node.js from https://nodejs.org/"
    }

    if (-not (Test-Command "poetry")) {
        Write-Host "Poetry not found. Attempting to install..." -ForegroundColor Yellow
        if (-not (Install-Poetry-Windows)) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Red
            Write-Host "Poetry installation failed." -ForegroundColor Red
            Write-Host ""
            Write-Host "To install manually, run:" -ForegroundColor Yellow
            Write-Host "  pip install poetry" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Or use pipx (recommended):" -ForegroundColor Yellow
            Write-Host "  pip install pipx && pipx install poetry" -ForegroundColor Cyan
            Write-Host "========================================" -ForegroundColor Red
            throw "poetry is required but was not found in PATH."
        }
    }

    Install-Npm-Deps

    $useLocalNx = (Test-Path './nx.bat') -or (Test-Path './.nx/nxw.js')

    function Invoke-Nx {
        param([string[]] $Arguments)
        if ($useLocalNx -and (Test-Path './nx.bat')) {
            & './nx.bat' @Arguments
        }
        else {
            & npx nx @Arguments
        }
    }

    Write-Step 2 5 "Installing API-HTTP Python dependencies..."
    Invoke-Nx @('run', 'api-http:install')

    Write-Step 3 5 "Running API-HTTP tests..."
    Invoke-Nx @('run', 'api-http:test')

    Write-Step 4 5 "Installing API Python dependencies..."
    Invoke-Nx @('run', 'api:install')

    Write-Step 5 5 "Applying API migrations..."
    Invoke-Nx @('run', 'api:migrate')

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    if ($useLocalNx -and (Test-Path './nx.bat')) {
        Write-Host "Start API server: .\nx.bat run api:dev" -ForegroundColor Cyan
    } else {
        Write-Host "Start API server: npx nx run api:dev" -ForegroundColor Cyan
    }
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Setup failed: $_" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
