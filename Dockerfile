FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend ./backend
COPY models ./models

# Set environment
ENV PYTHONUNBUFFERED=1
ENV AUTOMATION_MODE=live
ENV SCHEDULER_EMBEDDED=true
ENV PYTHONPATH=/app/backend:/app
ENV HOST=0.0.0.0

EXPOSE 8000

# Start FastAPI server
WORKDIR /app/backend
CMD ["python", "run.py"]
