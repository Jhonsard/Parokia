# =============================================================================
# Parokia — Backend Dockerfile
# Multi-stage: build dependencies once, ship a non-root image with a healthcheck.
# =============================================================================

# ---- build stage -----------------------------------------------------------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /install
COPY backend/requirements.txt .
RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# ---- runtime stage ---------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN groupadd --system parokia \
 && adduser --system --ingroup parokia --disabled-password --gecos "" parokia

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY backend/parokia ./parokia/
COPY backend/server.py ./
COPY backend/.env.example ./.env.example

USER parokia

EXPOSE 8000

ENV PORT=8000 \
    HOST=0.0.0.0 \
    PAROKIA_JWT_SECRET=replace-in-production \
    PAROKIA_ENV=production \
    PAROKIA_STRICT_CONFIG=1 \
    PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health', timeout=5)"

CMD ["python", "server.py"]
