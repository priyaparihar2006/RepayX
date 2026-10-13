FROM python:3.12-slim

# Install system tools and Node.js
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install WhatsApp bridge dependencies
COPY backend/whatsapp-bridge/package*.json ./backend/whatsapp-bridge/
RUN cd backend/whatsapp-bridge && npm install

# Copy application code and data artifacts
COPY . .

ENV AUTOMATION_MODE=live
ENV SCHEDULER_EMBEDDED=true
ENV WHATSAPP_BRIDGE_URL=http://127.0.0.1:8005

EXPOSE 8000 8005

RUN chmod +x backend/start.sh
CMD ["bash", "backend/start.sh"]
