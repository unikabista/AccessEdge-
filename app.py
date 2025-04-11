from flask import Flask, render_template, request, jsonify
from model.caption import describe_image
from model.speak import speak
import base64
import cv2
import numpy as np
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/capture', methods=['POST'])
def capture():
    data = request.json['image']
    header, encoded = data.split(",")
    img_data = base64.b64decode(encoded)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    filename = 'captured.jpg'
    cv2.imwrite(filename, img)

    caption = describe_image(filename)
    speak(caption)  # Optional: comment this out if not needed

    return jsonify({'caption': caption})

if __name__ == '__main__':
    app.run(debug=True)