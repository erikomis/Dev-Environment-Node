# Dev Environment Node - Windows Setup
# Run with: powershell -ExecutionPolicy Bypass -File windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "==> Iniciando setup do ambiente Node.js (Windows)" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "AVISO: Execute como Administrador para instalar todas as ferramentas." -ForegroundColor Yellow
}

# Install winget if not present (Windows 10+)
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "==> winget não encontrado. Instale manualmente o App Installer da Microsoft Store." -ForegroundColor Red
    exit 1
}

# Install nvm-windows
if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    Write-Host "==> Instalando nvm-windows..."
    winget install CoreyButler.NVMforWindows --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
} else {
    Write-Host "==> nvm já instalado"
}

# Install Node LTS
Write-Host "==> Instalando Node.js LTS..."
nvm install lts
nvm use lts

$nodeVersion = node --version
Write-Host "==> Node instalado: $nodeVersion"

# Install Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "==> Instalando Git..."
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
} else {
    Write-Host "==> Git já instalado"
}

# Install Docker Desktop
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "==> Instalando Docker Desktop..."
    winget install Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
    Write-Host "==> Docker instalado. Reinicie e abra o Docker Desktop para finalizar."
} else {
    Write-Host "==> Docker já instalado"
}

Write-Host ""
Write-Host "==> Setup concluído com sucesso!" -ForegroundColor Green
Write-Host "==> Reinicie o terminal para aplicar as mudanças." -ForegroundColor Yellow
