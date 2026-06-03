import sys

sys.path.append(".")
import cv2
from variable_server import sys_set_variables
import requests
import time
import math
import numpy as np


def detect_noses(wide_image):
    url = "https://detectpos.hugocastaneda.fr/detect"
    _, img_encoded = cv2.imencode(".jpg", wide_image)
    auth = "dca16c20-e0aa-4514-ab58-8727dc4f775a"
    files = {"image": ("image.jpg", img_encoded.tobytes(), "image/jpeg")}
    headers = {"Authorization": f"Bearer {auth}"}
    response = requests.post(url, files=files, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # array [ (x,y,conf), ...]
        return data
    else:
        print(f"Detection failed: {response.text}")
        return []


def get_filtered_noses(wide_image):
    detections = detect_noses(wide_image)
    return [(x, y, c) for x, y, c in detections if c > 0.5]


def get_2_noses(wide_image):
    noses = get_filtered_noses(wide_image)
    if len(noses) == 2:
        nose1, nose2 = noses
        if nose1[0] < nose2[0]:
            tmp = nose1
            nose1 = nose2
            nose2 = tmp
        nose1 = nose1[0] - wide_image.shape[1] / 2, nose1[1], nose1[2]
        conf = (nose1[2] + nose2[2]) / 2
        return nose2, nose1, conf
    else:
        return None


def compute_position(wide_image):

    noses = get_2_noses(wide_image)
    if noses is None:
        return None
    nose1, nose2, conf = noses
    if conf < 0.6:
        return None

    camera_separation_cm = 17.5
    camera_angles = 60
    img_width = wide_image.shape[1] / 2
    img_height = wide_image.shape[0]
    cx = img_width / 4
    cy = img_height / 2
    fx = img_width / (2 * math.tan(math.radians(camera_angles / 2)))
    fy = img_height / (2 * math.tan(math.radians(camera_angles / 2)))

    n1x, n1y = nose1[0], nose1[1]
    n2x, n2y = nose2[0], nose2[1]

    disparity = n1x - n2x
    if abs(disparity) < 1e-6:
        return None
    z = (fx * camera_separation_cm) / disparity
    x = (n1x - cx) * z / fx
    y = (n1y - cy) * z / fy

    z = 500 - z

    return (x, y, z)


def moving_average(history: np.ndarray):
    return history.mean(axis=0)


def run():

    print("Starting user position module...")

    MA = 7

    w, h = 600, 600
    # new white image from the top

    img = 255 * np.ones((h, w, 3), dtype=np.uint8)
    lx = None
    ly = None

    past_history = []

    cam1 = cv2.VideoCapture(0)
    cam2 = cv2.VideoCapture(2)

    while True:
        ret1, frame1 = cam1.read()
        ret2, frame2 = cam2.read()
        if not ret1 or not ret2:
            print("Failed to capture video")
            break
        wide_image = cv2.hconcat([frame1, frame2])
        position = compute_position(wide_image)
        if position is not None:
            x, y, z = position
            past_history.append((x, z))
            past_history = past_history[-MA:]
            x, z = moving_average(np.array(past_history))
            if lx is None and ly is None:
                lx = x
                ly = z
            dx = x - lx
            dy = z - ly
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= 100:
                lx, ly = x, z
                sys_set_variables("user_pos", {"x": x, "y": z})
            else:
                lx = None
                ly = None


if __name__ == "__main__":
    run()
