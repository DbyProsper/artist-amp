#!/usr/bin/env python3
"""Quick startup test for the backend"""

print("Checking package imports...")

try:
    import fastapi
    print("✓ FastAPI")
except Exception as e:
    print(f"✗ FastAPI: {e}")

try:
    import uvicorn
    print("✓ Uvicorn")
except Exception as e:
    print(f"✗ Uvicorn: {e}")

try:
    import torch
    print(f"✓ PyTorch (device: {'CUDA available' if torch.cuda.is_available() else 'CPU only'})")
except Exception as e:
    print(f"✗ PyTorch: {e}")

try:
    import torchaudio
    print("✓ TorchAudio")
except Exception as e:
    print(f"✗ TorchAudio: {e}")

try:
    import audiocraft
    print("✓ AudioCraft")
except Exception as e:
    print(f"⚠ AudioCraft: {e}")

try:
    from PIL import Image
    print("✓ Pillow")
except Exception as e:
    print(f"✗ Pillow: {e}")

print("\nAttempting to load backend...")
try:
    from main import app
    print("✓ Backend app loads successfully")
    print(f"✓ Found {len(app.routes)} routes")
except Exception as e:
    print(f"✗ Backend error: {e}")
    import traceback
    traceback.print_exc()
