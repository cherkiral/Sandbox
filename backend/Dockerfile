# Start from a Python base image
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Install Git
RUN apt-get update && apt-get install -y git && apt-get clean

# Build argument to force Docker cache invalidation
ARG CACHEBUST=1

# Clone the repository
ARG REPO_URL="https://github.com/cherkiral/Sandbox.git"
RUN rm -rf /app/.git && git clone ${REPO_URL} /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app

# Run the app with Alembic migrations and Uvicorn
CMD sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
