#!/bin/bash
# Dokploy-Ench Install Script
# Fork of Dokploy with all enterprise features unlocked
# Usage: curl -sSL https://raw.githubusercontent.com/HRNPH/dokploy-ench/main/install.sh | bash

set -e

GITHUB_REPO="HRNPH/dokploy"
IMAGE_NAME="ghcr.io/hrnph/dokploy-ench"

detect_version() {
    local version="${DOKPLOY_VERSION}"

    if [ -z "$version" ]; then
        echo "Detecting latest stable version from GitHub..." >&2
        version=$(curl -fsSL -o /dev/null -w '%{url_effective}\n' \
            "https://github.com/${GITHUB_REPO}/releases/latest" 2>/dev/null | \
            sed 's#.*/tag/##')

        if [ -z "$version" ]; then
            echo "Warning: Could not detect latest version, using 'latest'" >&2
            version="latest"
        else
            echo "Latest stable version: $version" >&2
        fi
    fi

    echo "$version"
}

is_proxmox_lxc() {
    if [ -n "$container" ] && [ "$container" = "lxc" ]; then
        return 0
    fi
    if grep -q "container=lxc" /proc/1/environ 2>/dev/null; then
        return 0
    fi
    return 1
}

generate_random_password() {
    local password=""
    if command -v openssl >/dev/null 2>&1; then
        password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    elif [ -r /dev/urandom ]; then
        password=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
    else
        password=$(echo "$(date +%s%N)-$(hostname)-$$-$RANDOM" | base64 | tr -d "=+/" | head -c 32)
    fi

    if [ -z "$password" ] || [ ${#password} -lt 20 ]; then
        echo "Error: Failed to generate random password" >&2
        exit 1
    fi
    echo "$password"
}

install_dokploy() {
    VERSION_TAG=$(detect_version)
    DOCKER_IMAGE="${IMAGE_NAME}:${VERSION_TAG}"

    echo "Installing Dokploy-Ench version: ${VERSION_TAG}"

    if [ "$(id -u)" != "0" ]; then
        echo "This script must be run as root" >&2
        exit 1
    fi

    if [ "$(uname)" = "Darwin" ]; then
        echo "This script must be run on Linux" >&2
        exit 1
    fi

    if [ -f /.dockerenv ]; then
        echo "This script must be run on Linux (not inside a container)" >&2
        exit 1
    fi

    if ss -tulnp | grep ':80 ' >/dev/null; then
        echo "Error: something is already running on port 80" >&2
        exit 1
    fi

    if ss -tulnp | grep ':443 ' >/dev/null; then
        echo "Error: something is already running on port 443" >&2
        exit 1
    fi

    if ss -tulnp | grep ':3000 ' >/dev/null; then
        echo "Error: something is already running on port 3000" >&2
        exit 1
    fi

    command_exists() {
        command -v "$@" > /dev/null 2>&1
    }

    if command_exists docker; then
        echo "Docker already installed"
    else
        curl -sSL https://get.docker.com | sh -s -- --version 28.5.0
    fi

    endpoint_mode=""
    if is_proxmox_lxc; then
        echo "Detected Proxmox LXC container - adding endpoint-mode dnsrr"
        endpoint_mode="--endpoint-mode dnsrr"
        sleep 3
    fi

    docker swarm leave --force 2>/dev/null

    get_private_ip() {
        ip addr show | grep -E "inet (192\.168\.|10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.)" | head -n1 | awk '{print $2}' | cut -d/ -f1
    }

    advertise_addr="${ADVERTISE_ADDR:-$(get_private_ip)}"

    if [ -z "$advertise_addr" ]; then
        echo "ERROR: Could not find private IP. Set ADVERTISE_ADDR manually."
        echo "Example: export ADVERTISE_ADDR=192.168.1.100"
        exit 1
    fi
    echo "Using advertise address: $advertise_addr"

    swarm_init_args="${DOCKER_SWARM_INIT_ARGS:-}"
    if [ -n "$swarm_init_args" ]; then
        docker swarm init --advertise-addr $advertise_addr $swarm_init_args
    else
        docker swarm init --advertise-addr $advertise_addr
    fi

    if [ $? -ne 0 ]; then
        echo "Error: Failed to initialize Docker Swarm" >&2
        exit 1
    fi

    echo "Swarm initialized"

    docker network rm -f dokploy-network 2>/dev/null
    docker network create --driver overlay --attachable dokploy-network
    echo "Network created"

    mkdir -p /etc/dokploy
    chmod 777 /etc/dokploy

    POSTGRES_PASSWORD=$(generate_random_password)
    echo "$POSTGRES_PASSWORD" | docker secret create dokploy_postgres_password - 2>/dev/null || true

    AUTH_SECRET=$(openssl rand -hex 32)
    echo "$AUTH_SECRET" | docker secret create dokploy_auth_secret - 2>/dev/null || true

    echo "Generated secure credentials"

    docker service create \
        --name dokploy-postgres \
        --constraint 'node.role==manager' \
        --network dokploy-network \
        --env POSTGRES_USER=dokploy \
        --env POSTGRES_DB=dokploy \
        --secret source=dokploy_postgres_password,target=/run/secrets/postgres_password \
        --env POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password \
        --mount type=volume,source=dokploy-postgres,target=/var/lib/postgresql/data \
        $endpoint_mode \
        postgres:16

    docker service create \
        --name dokploy-redis \
        --constraint 'node.role==manager' \
        --network dokploy-network \
        --mount type=volume,source=dokploy-redis,target=/data \
        $endpoint_mode \
        redis:7

    docker pull $DOCKER_IMAGE

    docker service create \
        --name dokploy \
        --replicas 1 \
        --network dokploy-network \
        --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
        --mount type=bind,source=/etc/dokploy,target=/etc/dokploy \
        --mount type=volume,source=dokploy,target=/root/.docker \
        --secret source=dokploy_postgres_password,target=/run/secrets/postgres_password \
        --secret source=dokploy_auth_secret,target=/run/secrets/dokploy_auth_secret \
        --publish published=3000,target=3000,mode=host \
        --update-parallelism 1 \
        --update-order stop-first \
        --constraint 'node.role == manager' \
        $endpoint_mode \
        -e ADVERTISE_ADDR=$advertise_addr \
        -e POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password \
        -e BETTER_AUTH_SECRET_FILE=/run/secrets/dokploy_auth_secret \
        $DOCKER_IMAGE

    sleep 4

    docker run -d \
        --name dokploy-traefik \
        --restart always \
        -v /etc/dokploy/traefik/traefik.yml:/etc/traefik/traefik.yml \
        -v /etc/dokploy/traefik/dynamic:/etc/dokploy/traefik/dynamic \
        -v /var/run/docker.sock:/var/run/docker.sock:ro \
        -p 80:80/tcp \
        -p 443:443/tcp \
        -p 443:443/udp \
        traefik:v3.6.7

    docker network connect dokploy-network dokploy-traefik

    GREEN="\033[0;32m"
    YELLOW="\033[1;33m"
    BLUE="\033[0;34m"
    NC="\033[0m"

    get_ip() {
        local ip=""
        ip=$(curl -4s --connect-timeout 5 https://ifconfig.io 2>/dev/null)
        if [ -z "$ip" ]; then ip=$(curl -4s --connect-timeout 5 https://icanhazip.com 2>/dev/null); fi
        if [ -z "$ip" ]; then ip=$(curl -6s --connect-timeout 5 https://ifconfig.io 2>/dev/null); fi
        echo "$ip"
    }

    format_ip_for_url() {
        local ip="$1"
        if echo "$ip" | grep -q ':'; then echo "[${ip}]"; else echo "${ip}"; fi
    }

    public_ip="${ADVERTISE_ADDR:-$(get_ip)}"
    formatted_addr=$(format_ip_for_url "$public_ip")

    echo ""
    printf "${GREEN}Congratulations, Dokploy-Ench is installed!${NC}\n"
    printf "${BLUE}Wait 15 seconds for the server to start${NC}\n"
    printf "${YELLOW}Please go to http://${formatted_addr}:3000${NC}\n\n"
}

update_dokploy() {
    VERSION_TAG=$(detect_version)
    DOCKER_IMAGE="${IMAGE_NAME}:${VERSION_TAG}"

    echo "Updating Dokploy-Ench to version: ${VERSION_TAG}"

    docker pull $DOCKER_IMAGE
    docker service update --image $DOCKER_IMAGE dokploy

    echo "Dokploy-Ench has been updated to version: ${VERSION_TAG}"
}

if [ "$1" = "update" ]; then
    update_dokploy
else
    install_dokploy
fi
