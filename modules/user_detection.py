import sys

sys.path.append(".")
import cv2
from variable_server import sys_set_variables, sys_get_variable
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

    try:
        response = requests.post(url, files=files, headers=headers)
    except Exception as e:
        print(f"Error during nose detection: {e}")
        return []

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
    half_w = wide_image.shape[1] / 2

    left_noses = [nose for nose in noses if nose[0] < half_w]
    right_noses = [nose for nose in noses if nose[0] >= half_w]

    if len(left_noses) != 1 or len(right_noses) != 1:
        return None

    left_nose = left_noses[0]
    right_nose_global = right_noses[0]

    right_nose = (
        right_nose_global[0] - half_w,
        right_nose_global[1],
        right_nose_global[2],
    )

    conf = (left_nose[2] + right_nose[2]) / 2

    # On garde le même ordre logique que votre ancien compute_position :
    # nose1 = droite locale, nose2 = gauche locale
    return right_nose, left_nose, conf


def compute_position(wide_image):

    noses = get_2_noses(wide_image)
    if noses is None:
        return None
    nose1, nose2, conf = noses
    if conf < 0.6:
        return None

    STEREO_K = -6750.379828
    DISPARITY_OFFSET_PX = 4.727684
    CAMERA_Z_ORIGIN_CM = 500.0

    MIN_Z_CAMERA_CM = 50.0
    MAX_Z_CAMERA_CM = 600.0

    camera_separation_cm = 17.5
    camera_angles = 60

    img_width = wide_image.shape[1] / 2
    img_height = wide_image.shape[0]
    cx = img_width / 2
    cy = img_height / 2
    fx = img_width / (2 * math.tan(math.radians(camera_angles / 2)))
    fy = fx

    n1x, n1y = nose1[0], nose1[1]
    n2x, n2y = nose2[0], nose2[1]

    disparity = n1x - n2x
    if abs(disparity) < 1e-6:
        return None

    effective_disparity = disparity - DISPARITY_OFFSET_PX

    if abs(effective_disparity) < 1e-6:
        return None

    z_camera = STEREO_K / effective_disparity

    if z_camera < MIN_Z_CAMERA_CM or z_camera > MAX_Z_CAMERA_CM:
        return None

    x = (n1x - cx) * z_camera / fx
    y = (n1y - cy) * z_camera / fy

    z = CAMERA_Z_ORIGIN_CM - z_camera

    return (x, y, z, noses)


def moving_average(history: np.ndarray):
    return history.mean(axis=0)


def draw(wide_image, position):
    # create image size/2 and text with position as str
    h, w = wide_image.shape[:2]

    img1 = cv2.resize(wide_image[:, : w // 2], (w // 2, h))
    img2 = cv2.resize(wide_image[:, w // 2 :], (w // 2, h))
    # opacity image
    img = cv2.addWeighted(img1, 0.5, img2, 0.5, 0)
    h, w = img.shape[:2]

    if position is not None:
        x, y, z, noses = position
        text = f"Position: x={x:.2f}, y={y:.2f}, z={z:.2f}"
        # draw noses
        nose1, nose2, conf = noses
        nx1, ny1 = int(nose1[0]), int(nose1[1])
        nx2, ny2 = int(nose2[0]), int(nose2[1])
        for nx, ny in [(nx1, ny1), (nx2, ny2)]:
            cv2.circle(img, (nx, ny), 5, (0, 0, 255), -1)
    else:
        text = "Position: Not detected"
    cv2.putText(
        img,
        text,
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (0, 0, 0),
        2,
        cv2.LINE_AA,
    )
    return img


def run():

    print("Starting user detection module...")

    MA = 7

    w, h = 600, 600
    # new white image from the top

    cam1 = cv2.VideoCapture(0)
    cam2 = cv2.VideoCapture(2)

    while True:
        detect_time = time.time()
        ret1, frame1 = cam1.read()
        ret2, frame2 = cam2.read()
        if not ret1 or not ret2:
            print("Failed to capture video")
            break
        wide_image = cv2.hconcat([frame1, frame2])
        position = compute_position(wide_image)
        if position is not None:
            x, y, z, noses = position
            # for 1 user for now
            sys_set_variables("user_detection", [{"x": x, "y": z, "time": detect_time}])


if __name__ == "__main__":
    run()
