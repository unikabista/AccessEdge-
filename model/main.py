from capture import capture_image
from caption import describe_image

def main():
    print("📸 Capturing image...")
    image_path = capture_image()
    
    print("🧠 Generating caption...")
    caption = describe_image(image_path)
    print("📝 Caption:", caption)

if __name__ == "__main__":
    main()