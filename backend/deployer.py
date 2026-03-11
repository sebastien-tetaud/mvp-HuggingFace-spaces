import os
import shutil
import uuid
from pathlib import Path
from typing import Generator
from git import Repo
import docker

# Directory where repos are cloned
REPOS_DIR = Path(__file__).parent / "repos"
REPOS_DIR.mkdir(exist_ok=True)

# Docker client
docker_client = docker.from_env()

# Port range for Gradio apps
PORT_START = 7860
PORT_END = 7900
used_ports: set[int] = set()

# Store build logs per space
build_logs: dict[str, list[str]] = {}


def get_available_port() -> int:
    """Find an available port in the range."""
    for port in range(PORT_START, PORT_END):
        if port not in used_ports:
            used_ports.add(port)
            return port
    raise RuntimeError("No available ports")


def release_port(port: int) -> None:
    """Release a port back to the pool."""
    used_ports.discard(port)


def add_log(space_id: str, message: str) -> None:
    """Add a log message for a space."""
    if space_id not in build_logs:
        build_logs[space_id] = []
    build_logs[space_id].append(message)


def get_build_logs(space_id: str) -> list[str]:
    """Get build logs for a space."""
    return build_logs.get(space_id, [])


def clone_repository(github_url: str, space_id: str) -> Path:
    """Clone a GitHub repository."""
    add_log(space_id, f"Cloning repository: {github_url}")
    repo_path = REPOS_DIR / space_id
    if repo_path.exists():
        shutil.rmtree(repo_path)
    Repo.clone_from(github_url, repo_path)
    add_log(space_id, "Repository cloned successfully")
    return repo_path


def build_docker_image(repo_path: Path, space_id: str) -> str:
    """Build a Docker image for the Gradio app."""
    dockerfile_template = Path(__file__).parent / "Dockerfile.template"
    dockerfile_dest = repo_path / "Dockerfile"

    # Copy Dockerfile template to repo
    shutil.copy(dockerfile_template, dockerfile_dest)
    add_log(space_id, "Dockerfile created")

    # Build the image with streaming logs
    image_tag = f"gradio-space-{space_id}"
    add_log(space_id, f"Building Docker image: {image_tag}")

    # Use low-level API for streaming build logs
    for chunk in docker_client.api.build(path=str(repo_path), tag=image_tag, decode=True):
        if 'stream' in chunk:
            log_line = chunk['stream'].strip()
            if log_line:
                add_log(space_id, log_line)
        if 'error' in chunk:
            add_log(space_id, f"ERROR: {chunk['error']}")
            raise Exception(chunk['error'])

    add_log(space_id, "Docker image built successfully")
    return image_tag


def run_container(image_tag: str, space_id: str, port: int) -> str:
    """Run a Docker container for the Gradio app."""
    container_name = f"space-{space_id}"
    add_log(space_id, f"Starting container on port {port}")

    # Remove existing container if it exists
    try:
        old_container = docker_client.containers.get(container_name)
        old_container.remove(force=True)
    except docker.errors.NotFound:
        pass

    # Try to run with GPU support first, fall back to CPU if it fails
    try:
        container = docker_client.containers.run(
            image_tag,
            name=container_name,
            ports={"7860/tcp": port},
            detach=True,
            runtime="nvidia",
            environment={"GRADIO_SERVER_NAME": "0.0.0.0", "NVIDIA_VISIBLE_DEVICES": "all"},
        )
        add_log(space_id, f"Container started with GPU support: {container.id[:12]}")
    except Exception as e:
        add_log(space_id, f"GPU runtime failed ({str(e)}), falling back to CPU")
        container = docker_client.containers.run(
            image_tag,
            name=container_name,
            ports={"7860/tcp": port},
            detach=True,
            environment={"GRADIO_SERVER_NAME": "0.0.0.0"},
        )
        add_log(space_id, f"Container started (CPU-only): {container.id[:12]}")

    return container.id


def stop_container(space_id: str) -> bool:
    """Stop and remove a container."""
    container_name = f"space-{space_id}"
    try:
        container = docker_client.containers.get(container_name)
        container.remove(force=True)
        return True
    except docker.errors.NotFound:
        return False


def get_container_status(space_id: str) -> str | None:
    """Get the status of a container."""
    container_name = f"space-{space_id}"
    try:
        container = docker_client.containers.get(container_name)
        return container.status
    except docker.errors.NotFound:
        return None


def get_container_logs(space_id: str, tail: int = 100) -> str:
    """Get runtime logs from a container."""
    container_name = f"space-{space_id}"
    try:
        container = docker_client.containers.get(container_name)
        return container.logs(tail=tail).decode('utf-8')
    except docker.errors.NotFound:
        return "Container not found"


def stream_container_logs(space_id: str) -> Generator[str, None, None]:
    """Stream runtime logs from a container."""
    container_name = f"space-{space_id}"
    try:
        container = docker_client.containers.get(container_name)
        for log in container.logs(stream=True, follow=True):
            yield log.decode('utf-8')
    except docker.errors.NotFound:
        yield "Container not found"


def deploy_space(github_url: str) -> dict:
    """Full deployment pipeline: clone, build, run."""
    space_id = str(uuid.uuid4())[:8]
    build_logs[space_id] = []  # Initialize logs
    add_log(space_id, f"Starting deployment for space: {space_id}")

    # Clone repository
    repo_path = clone_repository(github_url, space_id)

    # Build Docker image
    image_tag = build_docker_image(repo_path, space_id)

    # Get available port
    port = get_available_port()

    # Run container
    container_id = run_container(image_tag, space_id, port)

    add_log(space_id, f"Deployment complete! App available at http://localhost:{port}")

    return {
        "id": space_id,
        "github_url": github_url,
        "port": port,
        "container_id": container_id,
        "status": "running",
        "url": f"http://localhost:{port}",
    }
