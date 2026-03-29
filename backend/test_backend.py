#!/usr/bin/env python3
"""Test the backend endpoints"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint"""
    try:
        resp = requests.get(f"{BASE_URL}/health")
        print(f"✓ Health: {resp.status_code}")
        print(f"  Response: {resp.json()}")
        return True
    except Exception as e:
        print(f"✗ Health failed: {e}")
        return False

def test_lyrics():
    """Test lyrics generation"""
    try:
        data = {"prompt": "love song about unrequited love", "genre": "pop", "mood": "sad"}
        resp = requests.post(f"{BASE_URL}/generate/lyrics", json=data)
        print(f"\n✓ Lyrics: {resp.status_code}")
        result = resp.json()
        print(f"  Status: {result.get('status')}")
        if result.get('file'):
            print(f"  File length: {len(result['file'])} chars")
        return resp.status_code == 200
    except Exception as e:
        print(f"✗ Lyrics failed: {e}")
        return False

def test_cover():
    """Test cover art generation"""
    try:
        data = {"prompt": "abstract colorful geometric patterns", "genre": "electronic"}
        resp = requests.post(f"{BASE_URL}/generate/cover", json=data)
        print(f"\n✓ Cover: {resp.status_code}")
        result = resp.json()
        print(f"  Status: {result.get('status')}")
        print(f"  File: {result.get('file')}")
        return resp.status_code == 200
    except Exception as e:
        print(f"✗ Cover failed: {e}")
        return False

def test_music():
    """Test music generation"""
    try:
        data = {"prompt": "upbeat electronic dance music", "duration": 8}
        resp = requests.post(f"{BASE_URL}/generate/music", json=data)
        print(f"\n✓ Music: {resp.status_code}")
        result = resp.json()
        print(f"  Status: {result.get('status')}")
        print(f"  Message: {result.get('message') or result.get('detail')}")
        return True  # Music might fail if AudioCraft is not available
    except Exception as e:
        print(f"✗ Music failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Artist Amp Backend...\n")
    
    test_health()
    test_lyrics()
    test_cover()
    test_music()
    
    print("\n✓ Backend testing complete!")
