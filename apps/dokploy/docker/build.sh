#!/bin/bash
# Build script for Dokploy-Ench

IMAGE_NAME="ghcr.io/hrnph/dokploy-ench"
BUILD_TYPE=${1:-production}

if [ "$BUILD_TYPE" == "canary" ]; then
    TAG="canary"
else
    VERSION=$(node -p "require('./package.json').version")
    TAG="$VERSION"
fi

BUILDER=$(docker buildx create --use)

docker buildx build --platform linux/amd64,linux/arm64 --pull --rm -t "${IMAGE_NAME}:${TAG}" -f 'Dockerfile' .

docker buildx rm $BUILDER
