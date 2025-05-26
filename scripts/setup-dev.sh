#!/bin/bash

# Development Setup Script
# This script sets up the development environment including test dependencies

echo "🚀 Setting up development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install

# Verify installation
echo "🧪 Verifying test setup..."

# Run a quick unit test
echo "Running unit tests..."
npm run test

# Check if E2E tests can be initialized
echo "Checking E2E test setup..."
npx playwright --version

echo "✅ Development environment setup complete!"
echo ""
echo "🎉 You can now run:"
echo "  npm run test:unit    # Unit tests in watch mode"
echo "  npm run test:e2e     # End-to-end tests"
echo "  npm run test:all     # All tests"
echo ""
echo "📚 See TESTING.md for more information about testing." 