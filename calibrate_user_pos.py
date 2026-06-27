# calibrate_user_pos.py

import argparse
import time
import cv2
import numpy as np
import modules.user_detection as user_detection


def capture_wide_image(cam1, cam2):
    ret1, frame1 = cam1.read()
    ret2, frame2 = cam2.read()

    if not ret1 or not ret2:
        return None

    return cv2.hconcat([frame1, frame2])


def get_disparity_from_wide_image(wide_image, min_conf=0.6):
    noses = user_detection.get_2_noses(wide_image)

    if noses is None:
        return None

    nose1, nose2, conf = noses

    if conf < min_conf:
        return None

    n1x = nose1[0]
    n2x = nose2[0]

    disparity = n1x - n2x

    if abs(disparity) < 1e-6:
        return None

    return disparity, conf, noses


def measure_disparity(cam1, cam2, sample_count=40, min_conf=0.6):
    disparities = []
    confs = []

    print("Capture dans 5 secondes. Restez immobile.")
    for i in range(5, 0, -1):
        print(f"{i}...")
        time.sleep(1)

    for _ in range(sample_count):
        wide_image = capture_wide_image(cam1, cam2)

        if wide_image is None:
            continue

        result = get_disparity_from_wide_image(wide_image, min_conf=min_conf)

        if result is None:
            continue

        disparity, conf, noses = result
        disparities.append(disparity)
        confs.append(conf)

        # Debug visuel compatible avec votre fonction existante
        position = None
        cv2.imwrite("calibration_debug.jpg", user_detection.draw(wide_image, position))

        time.sleep(0.03)

    if len(disparities) < max(5, sample_count // 4):
        return None

    disparities = np.array(disparities, dtype=np.float64)
    confs = np.array(confs, dtype=np.float64)

    return {
        "disparity_mean": float(disparities.mean()),
        "disparity_std": float(disparities.std()),
        "conf_mean": float(confs.mean()),
        "sample_count": int(len(disparities)),
    }


def fit_stereo_calibration(measurements):
    distances = np.array([m["distance_cm"] for m in measurements], dtype=np.float64)
    disparities = np.array(
        [m["disparity_mean"] for m in measurements], dtype=np.float64
    )

    # Modèle :
    # disparity = stereo_k * (1 / distance_cm) + disparity_offset_px
    a = np.column_stack(
        [
            1.0 / distances,
            np.ones_like(distances),
        ]
    )

    stereo_k, disparity_offset_px = np.linalg.lstsq(a, disparities, rcond=None)[0]

    predicted_disparities = stereo_k / distances + disparity_offset_px
    residuals = disparities - predicted_disparities

    return {
        "stereo_k": float(stereo_k),
        "disparity_offset_px": float(disparity_offset_px),
        "residual_rmse_px": float(np.sqrt(np.mean(residuals**2))),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cam1", type=int, default=0)
    parser.add_argument("--cam2", type=int, default=2)
    parser.add_argument("--sample_count", type=int, default=40)
    parser.add_argument("--min_conf", type=float, default=0.6)
    args = parser.parse_args()

    cam1 = cv2.VideoCapture(args.cam1)
    cam2 = cv2.VideoCapture(args.cam2)

    if not cam1.isOpened():
        raise RuntimeError(f"Impossible d'ouvrir cam1={args.cam1}")

    if not cam2.isOpened():
        raise RuntimeError(f"Impossible d'ouvrir cam2={args.cam2}")

    measurements = []

    print("")
    print("Calibration user_pos")
    print("Mesurez la distance entre le plan des caméras et votre nez, en cm.")
    print("Faites au moins 2 distances, idéalement 3 ou 4.")
    print("Exemple : 120, 200, 300, 400")
    print("Entrez q pour terminer.")
    print("")

    try:
        while True:
            raw_distance = input("Distance caméra -> nez en cm > ").strip()

            if raw_distance.lower() in ["q", "quit", "exit"]:
                break

            try:
                distance_cm = float(raw_distance)
            except ValueError:
                print("Distance invalide.")
                continue

            result = measure_disparity(
                cam1,
                cam2,
                sample_count=args.sample_count,
                min_conf=args.min_conf,
            )

            if result is None:
                print("Pas assez de détections valides. Recommencez.")
                continue

            result["distance_cm"] = distance_cm
            measurements.append(result)

            print("")
            print(f"Distance         : {distance_cm:.2f} cm")
            print(f"Disparity moyenne: {result['disparity_mean']:.3f} px")
            print(f"Disparity std    : {result['disparity_std']:.3f} px")
            print(f"Confiance moyenne: {result['conf_mean']:.3f}")
            print(f"Samples valides  : {result['sample_count']}")
            print("")

    finally:
        cam1.release()
        cam2.release()

    if len(measurements) < 2:
        print(
            "Il faut au moins 2 distances pour estimer stereo_k et disparity_offset_px."
        )
        return

    calibration = fit_stereo_calibration(measurements)

    print("")
    print("======== RÉSULTAT CALIBRATION ========")
    print("")
    print("À copier dans user_pos.py :")
    print("")
    print(f"STEREO_K = {calibration['stereo_k']:.6f}")
    print(f"DISPARITY_OFFSET_PX = {calibration['disparity_offset_px']:.6f}")
    print("CAMERA_Z_ORIGIN_CM = 500.0")
    print("")
    print(f"Erreur RMSE disparity: {calibration['residual_rmse_px']:.3f} px")
    print("")
    print("Mesures utilisées :")
    for m in measurements:
        print(
            f"- distance={m['distance_cm']:.2f} cm, "
            f"disparity={m['disparity_mean']:.3f} px, "
            f"std={m['disparity_std']:.3f} px"
        )


if __name__ == "__main__":
    main()
