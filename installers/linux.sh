#!/usr/bin/env bash
set -e

echo "==> Iniciando setup do ambiente Node.js (Linux)"

# Detect package manager
if command -v apt-get &>/dev/null; then
  PKG="apt-get"
elif command -v dnf &>/dev/null; then
  PKG="dnf"
elif command -v pacman &>/dev/null; then
  PKG="pacman"
else
  echo "ERRO: Gerenciador de pacotes não identificado."
  exit 1
fi

echo "==> Usando: $PKG"

# Install curl if missing
if ! command -v curl &>/dev/null; then
  echo "==> Instalando curl..."
  if [ "$PKG" = "apt-get" ]; then
    sudo apt-get update && sudo apt-get install -y curl
  elif [ "$PKG" = "dnf" ]; then
    sudo dnf install -y curl
  fi
fi

# Install nvm
if [ ! -d "$HOME/.nvm" ]; then
  echo "==> Instalando nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
else
  echo "==> nvm já instalado"
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node LTS
echo "==> Instalando Node.js LTS..."
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'

echo "==> Node instalado: $(node --version)"

# Install Git
if ! command -v git &>/dev/null; then
  echo "==> Instalando Git..."
  if [ "$PKG" = "apt-get" ]; then
    sudo apt-get install -y git
  elif [ "$PKG" = "dnf" ]; then
    sudo dnf install -y git
  elif [ "$PKG" = "pacman" ]; then
    sudo pacman -S --noconfirm git
  fi
else
  echo "==> Git já instalado"
fi

# Install Docker
if ! command -v docker &>/dev/null; then
  echo "==> Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "==> Docker instalado. Faça logout e login para usar sem sudo."
else
  echo "==> Docker já instalado"
fi

echo ""
echo "==> Setup concluído com sucesso!"
