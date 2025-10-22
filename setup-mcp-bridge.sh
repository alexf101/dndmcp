#!/bin/bash
set -e

echo "Setting up Python MCP bridge..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
echo "Installing dependencies..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "✓ Setup complete!"
echo ""
echo "To run the MCP bridge:"
echo "  source venv/bin/activate"
echo "  python mcp-bridge.py"
