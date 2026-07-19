"""
AI Setup Service.
Ensures the required Ollama model is downloaded on first launch.
"""
import httpx
import asyncio

OLLAMA_URL = "http://localhost:11434"
MODEL_NAME = "gemma:2b"

async def check_and_download_model():
    """Checks if the model exists, downloads if missing."""
    print(f"[*] Checking AI model availability ({MODEL_NAME})...")
    try:
        # 1. Check if model exists
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{OLLAMA_URL}/api/tags")
            if res.status_code == 200:
                models = res.json().get("models", [])
                model_names = [m.get("name", "").split(":")[0] for m in models]
                
                if MODEL_NAME in model_names:
                    print("[*] AI model is ready.")
                    return
        
        # 2. Download if missing
        print(f"[*] AI model missing. Downloading {MODEL_NAME} (this may take a few minutes)...")
        async with httpx.AsyncClient() as client:
            # The pull endpoint streams progress, but we can just fire and forget 
            # or wait for it to complete. Waiting is better for UX.
            async with client.stream("POST", f"{OLLAMA_URL}/api/pull", json={"name": MODEL_NAME}, timeout=600.0) as response:
                async for line in response.aiter_lines():
                    # We don't need to print every line, just wait for completion
                    pass
        print("[*] AI model downloaded successfully.")
        
    except httpx.ConnectError:
        print("[!] Ollama engine not running. AI Assistant will be disabled.")
    except Exception as e:
        print(f"[!] Error setting up AI model: {e}")
