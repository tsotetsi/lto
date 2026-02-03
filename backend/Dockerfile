# Stage 1: Build Python dependencies.
FROM python:3.12-slim AS python-builder

ARG ENVIRONMENT=development
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

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

# Install system dependencies + MS Fonts EULA automation.
RUN echo "deb http://deb.debian.org/debian bookworm main contrib non-free" > /etc/apt/sources.list.d/bookworm.list && \
    echo "deb http://deb.debian.org/debian-security bookworm-security main contrib non-free" >> /etc/apt/sources.list.d/bookworm.list && \
    echo "deb http://deb.debian.org/debian bookworm-updates main contrib non-free" >> /etc/apt/sources.list.d/bookworm.list && \
    apt-get update && \
    # Make them available in the drop down as well.
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    texlive-xetex \
    texlive-lang-italian \
    texlive-lang-greek \
    texlive-fonts-recommended \
    fontconfig \
    fonts-liberation \
    ttf-mscorefonts-installer \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder.
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Setup custom fonts. 
# We copy them as root first to ensure fc-cache can register them system-wide
RUN mkdir -p /usr/share/fonts/truetype/custom
COPY ./fonts /usr/share/fonts/truetype/custom/

# Refresh font cache so XeLaTeX can see 'Times New Roman' and your 'Fontin'
RUN fc-cache -f -v

# Verify fonts are installed (This will print to build logs)
RUN fc-list | grep -i "Times New Roman" && fc-list | grep -i "Fontin"

# Copy source code and set permissions.
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]