#!/usr/bin/env python3
"""
Cal Notifier — Standalone SMS & iMessage Bridge
Dedicated strictly to the Cal Application.

Usage:
    python cal_notifier.py
"""

import asyncio
import logging
import sys
import os
import platform
import subprocess
import time
import smtplib
from email.message import EmailMessage
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cal_notifier")

app = FastAPI(title="Cal Notifier Service")

# Enable CORS for the Cal frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    to: str
    message: str

def send_voice_sync(to: str, message: str):
    """Synchronous Selenium worker for Google Voice."""
    # Shared session path between local/infra
    session_path = os.path.join(os.path.expanduser("~"), ".agents", "sessions", "google_voice")
    
    options = webdriver.ChromeOptions()
    options.add_argument(f"--user-data-dir={session_path}")
    options.add_argument("--profile-directory=Default")
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # Docker/Linux Specifics: Use system-installed Chromium
    if platform.system() == "Linux":
        if os.path.exists("/usr/bin/chromium"):
            options.binary_location = "/usr/bin/chromium"
        
        # Use system chromedriver if it exists
        if os.path.exists("/usr/bin/chromedriver"):
            driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)
        else:
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    else:
        # Local MacOS/Windows logic
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    wait = WebDriverWait(driver, 20)
    
    try:
        driver.get("https://voice.google.com/u/0/messages")
        
        # 1. Click 'Send new message'
        new_msg_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@aria-label='Send new message' and @role='button']")))
        new_msg_btn.click()
        
        # 2. Input Recipient
        to_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@aria-label='Type a name or phone number']")))
        to_field.send_keys(to)
        time.sleep(1)
        
        # 3. Input Message
        msg_field = wait.until(EC.presence_of_element_located((By.XPATH, "//textarea[@aria-label='Type a message']")))
        msg_field.send_keys(message)
        
        # 4. Click Send
        send_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@aria-label='Send message' and @role='button']")))
        send_btn.click()
        
        time.sleep(2)
        return True
    except Exception as e:
        logger.error(f"Selenium Error: {str(e)}")
        return False
    finally:
        driver.quit()

@app.post("/v1/notifications/imessage")
async def send_imessage(req: MessageRequest):
    """Cal-specific iMessage bridge."""
    try:
        current_os = platform.system()
        if current_os == "Darwin":
            script = f'tell application "Messages" to send "{req.message}" to buddy "{req.to}"'
            result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
            if result.returncode == 0:
                return {"status": "success", "platform": "macos_native"}
        
        # SMTP Fallback
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")
        if smtp_user and smtp_pass:
            msg = EmailMessage()
            msg.set_content(req.message)
            msg["Subject"] = "Cal Alert"
            msg["From"] = smtp_user
            msg["To"] = req.to
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            return {"status": "success", "platform": "smtp_gateway"}
        
        return {"status": "error", "message": "No valid channel"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/notifications/voice")
async def send_voice(req: MessageRequest):
    """Dedicated Google Voice bridge for Cal."""
    try:
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(None, send_voice_sync, req.to, req.message)
        if success:
            return {"status": "success", "platform": "google_voice"}
        else:
            raise Exception("Selenium send failed")
    except Exception as e:
        logger.error(f"Google Voice Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/notifications/voice/status")
async def get_voice_status():
    """Status Check for Google Voice session."""
    session_path = os.path.join(os.path.expanduser("~"), ".agents", "sessions", "google_voice", "Default")
    is_ready = os.path.exists(session_path)
    return {
        "status": "ready" if is_ready else "offline",
        "session_exists": is_ready
    }

@app.post("/v1/notifications/voice/init")
async def init_voice_session():
    """Launch visible browser for login."""
    try:
        session_path = os.path.join(os.path.expanduser("~"), ".agents", "sessions", "google_voice")
        os.makedirs(session_path, exist_ok=True)
        
        # Direct launch logic
        script_path = os.path.join(os.path.dirname(__file__), "voice_init_standalone.py")
        with open(script_path, "w") as f:
            f.write(f'''
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

options = webdriver.ChromeOptions()
options.add_argument(f"--user-data-dir={session_path}")
options.add_argument("--profile-directory=Default")
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
driver.get("https://voice.google.com/u/0/messages")
print("Log in manually and solve any security checks.")
print("Close the window when finished.")
while True:
    try:
        _ = driver.window_handles
        time.sleep(1)
    except:
        break
''')
        
        subprocess.Popen([sys.executable, script_path])
        return {"status": "initializing", "message": "Login window launched."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info("🚀 Starting Cal Notifier on http://127.0.0.1:3004")
    uvicorn.run(app, host="0.0.0.0", port=3004)
