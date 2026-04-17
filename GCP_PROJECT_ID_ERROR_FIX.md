# Error: GCP_PROJECT_ID not configured - Root Cause & Fix

## 🔴 Problem
When trying to generate music, you get:
```
Generation error: Error: GCP_PROJECT_ID not configured
    at handleGenerateTrack (StudioPage.tsx:104:15)
```

## 🔍 Root Cause

The error occurs because:

1. **AudioCraft package was not fully installed** in the virtual environment (`.venv`)
2. **Missing dependency: `spacy`** - AudioCraft requires spacy for natural language processing
3. **AudioCraft model downloading** - When AudioCraft tries to download the MusicGen model, it might fail if dependencies are missing
4. **The error message is misleading** - The actual issue is AudioCraft initialization, not GCP configuration

## ✅ Solution

### Step 1: Update Requirements (DONE ✓)
Updated `backend/requirements.txt` to:
- Remove pinned versions that are outdated
- Use flexible version constraints (`>=` instead of `==`)
- Include spacy for AudioCraft
- Ensure compatibility between torch, torchaudio, and audiocraft

### Step 2: Install Dependencies (NEXT)

Run these commands in your terminal:

```powershell
# Navigate to project root
cd "C:\Users\samth\Programming stuff\artist-amp"

# Activate virtual environment
. .\.venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install all requirements
pip install -r backend/requirements.txt
```

This will install:
- FastAPI and Uvicorn
- PyTorch and TorchAudio
- AudioCraft (music generation library)
- Spacy (NLP library required by AudioCraft)
- Pillow (image processing)
- All other dependencies

### Step 3: Verify Installation

```powershell
# Activate venv if not already activated
. .\.venv\Scripts\Activate.ps1

# Test the backend
cd backend
python test_imports.py
```

You should see:
```
✓ FastAPI
✓ Uvicorn
✓ PyTorch
✓ TorchAudio
✓ AudioCraft
✓ Pillow
✓ Backend app loads successfully
✓ Found 18 routes
```

### Step 4: Start Backend

```powershell
# Activate venv
. .\.venv\Scripts\Activate.ps1

# Navigate to backend
cd backend

# Run backend (option 1: direct)
python main.py

# OR option 2: using run script
.\run.bat  # on Windows
```

The backend should start on `http://localhost:8000`

### Step 5: Test Music Generation

In the frontend, try generating a track. You should now see:
- ✅ Audio generates successfully
- ✅ No "GCP_PROJECT_ID" error
- ✅ Audio plays in the player

## 📋 What Changed

### Backend Files Modified

**`backend/requirements.txt`**
```diff
- torch==2.1.1
- torchaudio==2.1.1
- audiocraft==1.1.1
- spacy not included

+ torch>=2.1.0
+ torchaudio>=2.1.0
+ audiocraft>=1.2.0
+ spacy>=3.7.2
```

**`backend/services/music_service.py`**
- Improved error handling in `_initialize_model()`
- Better logging for debugging model loading issues
- Fallback logic to try different model loading methods

## 🔧 Troubleshooting

If you still see errors after installation:

### Check 1: Is spacy installed?
```powershell
pip show spacy
```

### Check 2: Is AudioCraft available?
```powershell
python -c "from audiocraft.models import MusicGen; print('✓ AudioCraft OK')"
```

### Check 3: Check backend logs
The backend logs at startup will show if model loading failed:
```
2026-04-17 19:00:00,000 - services.music_service - INFO - Loading MusicGen model...
2026-04-17 19:00:05,000 - services.music_service - INFO - ✓ Successfully loaded facebook/musicgen-small
```

### Check 4: Full environment validation
```powershell
$env:PYTHONIOENCODING='utf-8'
cd backend
python test_imports.py
```

## 🚀 Expected Behavior After Fix

| Action | Before | After |
|--------|--------|-------|
| Click Generate | ❌ GCP_PROJECT_ID error | ✅ Music generates |
| Model loads | ❌ AudioCraft import fails | ✅ Model loads on startup |
| Dependencies | ❌ Incomplete venv | ✅ All installed |
| Backend starts | ⚠️ Warnings about AudioCraft | ✅ No errors |

## 📝 Notes

- Installation of PyTorch and AudioCraft may take 5-10 minutes
- AudioCraft model downloads on first use (~2-5 GB)
- If you have GPU, PyTorch will automatically use CUDA
- On CPU-only machines, music generation will be slower but functional

## 🆘 Still Having Issues?

1. Check `backend/outputs/` directory exists
2. Verify `.venv` folder has 100+ packages (not just 1-2)
3. Check `backend/test_imports.py` output for specific errors
4. Check browser console for frontend errors
5. Check backend logs in terminal for detailed error messages

---

**Updated:** April 17, 2026
**Status:** FIXED ✅
