# Stage 1: Build Python dependencies.
FROM python:3.12-slim AS python-builder

ARG ENVIRONMENT=development
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Create virtual environment.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install requirements.
COPY requirements ./requirements/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements/base.txt

RUN if [ "$ENVIRONMENT" = "development" ]; then \
      pip install --no-cache-dir -r requirements/development.txt; \
    else \
      pip install --no-cache-dir -r requirements/production.txt; \
    fi

# Stage 2: Final Production Image.
FROM python:3.12-slim

# Create non-root user.
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-fonts-recommended \
    fontconfig \
    fonts-liberation \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder.
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Setup custom fonts.
RUN mkdir -p /usr/share/fonts/truetype/custom
COPY --chown=appuser:appuser ./fonts /usr/share/fonts/truetype/custom
RUN fc-cache -f -v

# Verify fonts are installed.
RUN fc-list | grep -i "Liberation" && fc-list | grep -i "Fontin"

# Copy source code and set permissions.
COPY --chown=appuser:appuser . .

# Switch to non-root user.
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]