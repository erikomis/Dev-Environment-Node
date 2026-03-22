#!/usr/bin/env bash
set -e

echo "==> Iniciando setup do ambiente Node.js (macOS)"

# Install Homebrew if not present
if ! command -v brew &>/dev/null; then
  echo "==> Instalando Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "==> Homebrew já instalado"
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

# Install latest LTS Node
echo "==> Instalando Node.js LTS..."
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'

echo "==> Node instalado: $(node --version)"
echo "==> npm instalado: $(npm --version)"

# Install Git if not present
if ! command -v git &>/dev/null; then
  echo "==> Instalando Git..."
  brew install git
else
  echo "==> Git já instalado: $(git --version)"
fi

echo ""
echo "==> Setup concluído com sucesso!"
