from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch
import pytesseract
import cv2
import numpy as np

# Set Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Initialize models and processors globally to avoid reloading
blip_processor = None
blip_model = None
device = "cuda" if torch.cuda.is_available() else "cpu"

def load_models():
    global blip_processor, blip_model
    if blip_processor is None or blip_model is None:
        print(f"Loading BLIP Large model on {device}")
        blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
        blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large").to(device)
        blip_model.eval()

def extract_text(image):
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply thresholding to preprocess the image
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    
    # Apply dilation to connect text components
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
    gray = cv2.dilate(gray, kernel, iterations=1)
    
    # Perform OCR
    text = pytesseract.image_to_string(gray)
    return text.strip()

def describe_image(image_path):
    # Load models if not already loaded
    load_models()
    
    # Process image
    image = Image.open(image_path).convert("RGB")
    cv_image = cv2.imread(image_path)
    
    # Extract text using OCR
    text = extract_text(cv_image)
    
    # Get image description from BLIP
    blip_inputs = blip_processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        blip_outputs = blip_model.generate(
            **blip_inputs,
            max_length=20,
            num_beams=3,
            early_stopping=True
        )
    
    # Get BLIP description
    description = blip_processor.decode(blip_outputs[0], skip_special_tokens=True)
    
    # Combine description with text if text is found
    if text:
        return f"{description} The text in the image reads: {text}"
    return description
