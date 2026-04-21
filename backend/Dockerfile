FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para WeasyPrint e PostgreSQL
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libcairo2 \
    gir1.2-pango-1.0 \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Criar diretório para PDFs gerados
RUN mkdir -p /app/generated_pdfs

# Expor porta
EXPOSE 8000

# Comando para iniciar a aplicação
CMD ["sh", "-c", "uvicorn app.main:app --host ${UVICORN_HOST:-0.0.0.0} --port ${UVICORN_PORT:-8000}"]
