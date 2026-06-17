#!/bin/bash
# Feature build script for Dokploy-Ench

IMAGE_NAME="ghcr.io/hrnph/dokploy-ench"

# Build for local testing (amd64 only)
docker build --platform linux/amd64 --pull --rm -t "${IMAGE_NAME}:feature" -f 'Dockerfile' .

# To push (uncomment):
# docker buildx build --platform linux/amd64,linux/arm64 --pull --rm -t "${IMAGE_NAME}:feature" -f 'Dockerfile' --push .
