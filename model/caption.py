from transformers import VisionEncoderDecoderModel, ViTImageProcessor, GPT2TokenizerFast
from PIL import Image
import torch
import requests
from io import BytesIO
from translate import Translator

class ImageCaptioner:
    def __init__(self):
        print("Initializing image captioning model...")
        # Initialize ViT-GPT2 model
        print("Loading model weights...")
        self.model = VisionEncoderDecoderModel.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        print("Loading feature extractor...")
        self.feature_extractor = ViTImageProcessor.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        print("Loading tokenizer...")
        self.tokenizer = GPT2TokenizerFast.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        
        # Move to GPU if available
        print("Setting up device...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        self.model.to(self.device)
        
        # Set model to evaluation mode
        print("Setting model to evaluation mode...")
        self.model.eval()
        print("Model initialization complete!")
        
    def describe_image(self, image_path, target_language='en'):
        try:
            print(f"Processing image: {image_path}")
            # Load and preprocess image
            if image_path.startswith('http'):
                print("Downloading image from URL...")
                response = requests.get(image_path)
                image = Image.open(BytesIO(response.content))
            else:
                print("Loading local image...")
                image = Image.open(image_path)
            
            image = image.convert('RGB')
            
            # Prepare inputs
            print("Preparing image for model...")
            pixel_values = self.feature_extractor(images=[image], return_tensors="pt").pixel_values
            pixel_values = pixel_values.to(self.device)

            # Generate caption
            print("Generating caption...")
            with torch.no_grad():
                output_ids = self.model.generate(
                    pixel_values,
                    max_length=16,
                    num_beams=4,
                    return_dict_in_generate=True
                ).sequences
            
            # Decode the output
            print("Decoding caption...")
            caption = self.tokenizer.batch_decode(output_ids, skip_special_tokens=True)[0]
            
            # Translate if needed
            if target_language != 'en':
                print(f"Translating to {target_language}...")
                try:
                    translator = Translator(to_lang=target_language)
                    caption = translator.translate(caption)
                except Exception as e:
                    print(f"Translation error: {str(e)}")
                    # Return English caption if translation fails
                
            print(f"Caption generated: {caption}")
            return caption
            
        except Exception as e:
            print(f"Error in caption generation: {str(e)}")
            return "Sorry, I couldn't generate a caption for this image."

# Create a singleton instance
print("Creating ImageCaptioner instance...")
captioner = ImageCaptioner()

def describe_image(image_path, target_language='en'):
    return captioner.describe_image(image_path, target_language)
