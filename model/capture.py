import cv2
import time

def capture_image(filename="captured.jpg"):
    cap = cv2.VideoCapture(0)

    # Countdown from 3
    for i in range(3, 0, -1):
        print(f"📸 Capturing in {i}...")
        time.sleep(1)

    ret, frame = cap.read()
    if ret:
        cv2.imwrite(filename, frame)
        print(f"✅ Image saved to {filename}")
    else:
        print("❌ Failed to capture image from camera.")
    cap.release()
    return filename

