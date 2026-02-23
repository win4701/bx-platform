FROM python:3.11-slim

# منع إنشاء ملفات cache
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# تثبيت المتطلبات
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# نسخ المشروع
COPY . .

# فتح البورت
EXPOSE 8000

# تشغيل عبر uvicorn (Production)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
