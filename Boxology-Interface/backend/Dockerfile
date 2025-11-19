FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY . .
# copy full project context (compose mounts .:/app)
RUN pip install --no-cache-dir fastapi uvicorn sparqlwrapper pandas
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]