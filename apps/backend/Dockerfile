FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for psycopg2 and other native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only the requirements first to leverage Docker layer caching
COPY apps/backend/requirements.txt ./apps/backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r apps/backend/requirements.txt

# Copy the shared packages which the backend imports
COPY packages ./packages

# Copy the backend source code
COPY apps/backend ./apps/backend

# Set working directory to the backend app
WORKDIR /app/apps/backend

# Expose the port (Render provides the PORT environment variable)
EXPOSE 8000

# Start the FastAPI server using Uvicorn
CMD ["sh", "-c", "uvicorn app.main:create_app --host 0.0.0.0 --port ${PORT:-8000}"]
