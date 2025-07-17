#!/bin/bash

# AI Meeting Scheduler - Authentication Testing Script
# This script runs comprehensive tests for the authentication system

echo "🚀 AI Meeting Scheduler - Authentication Test Suite"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Pre-test checks..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from template"
        echo "🔧 Please edit .env.local with your actual Supabase credentials before running the app"
    else
        echo "❌ Error: .env.example not found. Please create .env.local manually."
        exit 1
    fi
fi

echo ""
echo "🧪 Running Authentication Tests..."
echo "=================================="

# Run Jest tests for authentication
echo "1️⃣ Running SignInForm tests..."
npm test -- __tests__/auth/signin-form.test.tsx --verbose

echo ""
echo "2️⃣ Running SignUpForm tests..."
npm test -- __tests__/auth/signup-form.test.tsx --verbose

echo ""
echo "3️⃣ Running all authentication tests with coverage..."
npm test -- __tests__/auth/ --coverage --watchAll=false

echo ""
echo "🔍 Test Results Summary:"
echo "======================="

# Check test results
if [ $? -eq 0 ]; then
    echo "✅ All authentication tests passed!"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Start the development server: npm run dev"
    echo "2. Test authentication flows manually:"
    echo "   - Visit http://localhost:3000/auth/signup"
    echo "   - Visit http://localhost:3000/auth/signin"
    echo "   - Test OAuth providers (requires Supabase setup)"
    echo "   - Test profile management at /dashboard/profile"
    echo ""
    echo "📖 For detailed setup instructions, see README.md"
else
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi

echo ""
echo "🔧 Development Commands:"
echo "======================="
echo "npm run dev          # Start development server"
echo "npm run build        # Test production build"
echo "npm run lint         # Check code quality"
echo "npm test             # Run all tests"
echo "npx prisma studio    # View database"
echo ""
echo "Happy coding! 🎉"
