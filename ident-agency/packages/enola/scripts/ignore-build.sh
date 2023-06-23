#!/bin/bash

echo "Checking commit message for [skip deploy]"

# Check if commit message contains [skip deploy] and cancel build if it does
if git log -1 --pretty=oneline --abbrev-commit | grep -we "\[skip deploy\]" -e "\[skip build\]" ; then  # Don't build
  echo "🛑 - Build cancelled"
  exit 0;
fi

# see if we have a force build or deploy active
if git log -1 --pretty=oneline --abbrev-commit | grep -we "\[force deploy\]" -e "\[force build\]" ; then
  echo "✅ - Force build or deploy active"
  exit 1;
fi

# see if any files changed in our path
if git diff HEAD^ HEAD --quiet . ; then
  echo "🛑 - No files changed in our path"
  exit 0;
fi

# Build
echo "✅ - Build can proceed"
exit 1;
