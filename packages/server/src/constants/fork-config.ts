/**
 * Fork configuration for Dokploy-Ench
 * Change these values to match your fork's Docker image and GitHub repo.
 */
export const FORK_DOCKER_IMAGE = "ghcr.io/hrnph/dokploy-ench";
export const FORK_GITHUB_REPO = "HRNPH/dokploy-ench";
export const FORK_DOCKERHUB_API = `https://hub.docker.com/v2/repositories/${FORK_DOCKER_IMAGE.replace("ghcr.io/", "")}/tags`;
