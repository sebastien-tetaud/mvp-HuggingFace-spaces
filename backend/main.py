from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import uuid
import os
from pathlib import Path

from deployer import (
    deploy_space,
    stop_container,
    get_container_status,
    release_port,
    get_build_logs,
    get_container_logs,
    stream_container_logs,
)

app = FastAPI(title="Destine Spaces API", version="0.1.0")

# Create uploads directory
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (after CORS middleware)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# In-memory storage for spaces
spaces: dict[str, dict] = {}


class DeployRequest(BaseModel):
    github_url: str
    title: str | None = None
    description: str | None = None
    image_url: str | None = None


class SpaceResponse(BaseModel):
    id: str
    github_url: str
    port: int
    status: str
    url: str
    title: str | None = None
    description: str | None = None
    image_url: str | None = None


@app.get("/")
def root():
    return {"message": "Destine Spaces API", "version": "0.1.0"}


@app.post("/api/deploy", response_model=SpaceResponse)
def deploy(request: DeployRequest):
    """Deploy a Gradio app from a GitHub repository."""
    try:
        space = deploy_space(request.github_url)
        # Add metadata
        space["title"] = request.title or space.get("title")
        space["description"] = request.description
        space["image_url"] = request.image_url
        spaces[space["id"]] = space
        return SpaceResponse(**space)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/spaces")
def list_spaces():
    """List all deployed spaces."""
    # Update status for each space
    for space_id, space in spaces.items():
        status = get_container_status(space_id)
        space["status"] = status or "stopped"
    return list(spaces.values())


@app.get("/api/spaces/{space_id}")
def get_space(space_id: str):
    """Get a specific space."""
    if space_id not in spaces:
        raise HTTPException(status_code=404, detail="Space not found")

    space = spaces[space_id]
    status = get_container_status(space_id)
    space["status"] = status or "stopped"
    return space


@app.delete("/api/spaces/{space_id}")
def delete_space(space_id: str):
    """Stop and remove a space."""
    if space_id not in spaces:
        raise HTTPException(status_code=404, detail="Space not found")

    space = spaces[space_id]
    stop_container(space_id)
    release_port(space["port"])
    del spaces[space_id]

    return {"message": f"Space {space_id} deleted"}


@app.get("/api/spaces/{space_id}/logs/build")
def get_space_build_logs(space_id: str):
    """Get build logs for a space."""
    logs = get_build_logs(space_id)
    return {"space_id": space_id, "type": "build", "logs": logs}


@app.get("/api/spaces/{space_id}/logs/runtime")
def get_space_runtime_logs(space_id: str, tail: int = 100):
    """Get runtime logs from a container."""
    logs = get_container_logs(space_id, tail)
    return {"space_id": space_id, "type": "runtime", "logs": logs}


@app.get("/api/spaces/{space_id}/logs/stream")
async def stream_space_logs(space_id: str):
    """Stream runtime logs from a container via SSE."""
    async def generate():
        for log_line in stream_container_logs(space_id):
            yield f"data: {log_line}\n\n"
            await asyncio.sleep(0.01)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload a cover image for a space."""
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename

    # Save file
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Return the URL
    return {"url": f"/uploads/{filename}", "filename": filename}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
