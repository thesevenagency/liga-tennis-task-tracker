#!/bin/bash

# Build the project
echo "Building project..."
npm run build

# Create a new orphan branch (no history)
echo "Creating new gh-pages branch..."
git checkout --orphan gh-pages

# Remove all files
git rm -rf .

# Copy built files
echo "Copying built files..."
cp -r dist/* .

# Remove dist folder
rm -rf dist

# Add all files
git add .

# Commit
echo "Committing changes..."
git commit -m "Deploy to GitHub Pages"

# Push to origin
echo "Pushing to GitHub..."
git push origin gh-pages --force

# Go back to main
echo "Switching back to main branch..."
git checkout main

echo "Deployment complete!"
