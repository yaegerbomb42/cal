FROM python:3.11-slim

# Install system dependencies for Chromium/Selenium on ARM64/AMD64
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    libnss3 \
    libfontconfig1 \
    libxrender1 \
    libxtst6 \
    libxi6 \
    libasound2 \
    libatk1.0-0 \
    libgtk-3-0 \
    libxss1 \
    libgbm-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables for Selenium to find Chromium
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/lib/chromium/

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

EXPOSE 3004

# Run with uvicorn
CMD ["uvicorn", "cal_notifier:app", "--host", "0.0.0.0", "--port", "3004"]
