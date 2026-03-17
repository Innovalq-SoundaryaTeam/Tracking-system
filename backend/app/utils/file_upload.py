import os
import uuid
from fastapi import UploadFile, HTTPException
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "5242880"))  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

def validate_file(file: UploadFile) -> bool:
    """Validate uploaded file"""
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE} bytes"
        )
    
    # Check file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    return True

def save_upload_file(file: UploadFile, subfolder: str = "delivery_proofs") -> str:
    """Save uploaded file and return file path"""
    validate_file(file)
    
    # Create upload directory if it doesn't exist
    upload_path = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(upload_path, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_path, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Validate image content
        try:
            with Image.open(file_path) as img:
                img.verify()
        except Exception:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Return relative path for database storage
        return os.path.join(subfolder, unique_filename).replace("\\", "/")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
