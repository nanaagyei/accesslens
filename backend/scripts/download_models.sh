#!/bin/bash
# Download and convert YOLO26n weights for AccessLens
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MODEL_DIR="$PROJECT_ROOT/backend/models"
YOLO_MLX_DIR="$PROJECT_ROOT/../yolo-mlx"

mkdir -p "$MODEL_DIR"

echo "=== AccessLens Model Setup ==="

# Step 1: Download yolo26n.pt if not present
PT_PATH="$MODEL_DIR/yolo26n.pt"
if [ -f "$PT_PATH" ]; then
    echo "yolo26n.pt already exists, skipping download."
else
    echo "Downloading yolo26n.pt..."
    curl -L --fail --progress-bar \
        -o "$PT_PATH" \
        "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26n.pt"
    echo "Downloaded yolo26n.pt"
fi

# Step 2: Convert to npz if not present
NPZ_PATH="$MODEL_DIR/yolo26n.npz"
if [ -f "$NPZ_PATH" ]; then
    echo "yolo26n.npz already exists, skipping conversion."
else
    echo "Converting to MLX format..."
    # Use the yolo-mlx CLI (must be installed)
    yolo26 converters convert "$PT_PATH" -o "$NPZ_PATH" --verify
    echo "Converted to yolo26n.npz"
fi

echo ""
echo "Model ready at: $NPZ_PATH"
echo "Run 'make run-backend' to start the server."
