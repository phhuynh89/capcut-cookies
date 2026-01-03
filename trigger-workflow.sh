#!/bin/bash

# Script to commit and push to trigger-action branch to trigger GitHub Actions workflow

set -e  # Exit on error

# Change to the script's directory to ensure we're in the right location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BRANCH="trigger-action"
COMMIT_MESSAGE="chore: trigger workflow - $(date +'%Y-%m-%d %H:%M:%S')"

echo "🚀 Triggering workflow by pushing to $BRANCH branch..."
echo "📁 Working directory: $(pwd)"

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository in $(pwd)"
    echo "💡 Make sure you're running this script from a git repository directory"
    exit 1
fi

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch origin

# Check if branch exists remotely
if git show-ref --verify --quiet refs/remotes/origin/$BRANCH; then
    echo "✅ Branch $BRANCH exists remotely"
    # Checkout the branch (create local if it doesn't exist)
    if git show-ref --verify --quiet refs/heads/$BRANCH; then
        echo "📂 Switching to existing local branch $BRANCH..."
        git checkout $BRANCH
        git pull origin $BRANCH || true
    else
        echo "📂 Creating local branch $BRANCH from remote..."
        git checkout -b $BRANCH origin/$BRANCH
    fi
else
    echo "📂 Branch $BRANCH doesn't exist remotely, creating it..."
    # Create branch from current branch or main/master
    if git show-ref --verify --quiet refs/heads/main; then
        git checkout main
    elif git show-ref --verify --quiet refs/heads/master; then
        git checkout master
    fi
    git checkout -b $BRANCH
fi

# Add all changes
echo "📝 Staging all changes..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "⚠️  No changes to commit. Creating an empty commit to trigger workflow..."
    git commit --allow-empty -m "$COMMIT_MESSAGE"
else
    echo "💾 Committing changes..."
    git commit -m "$COMMIT_MESSAGE"
fi

# Push to remote
echo "📤 Pushing to origin/$BRANCH..."
git push origin $BRANCH

echo "✅ Successfully pushed to $BRANCH branch. Workflow should trigger shortly!"

