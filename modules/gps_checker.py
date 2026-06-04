import sys

sys.path.append(".")
from flask import Flask, request, jsonify, send_from_directory
import requests
import json
import time
import threading
import os
import math
from variable_server import (
    sys_get_variable,
    sys_set_variables,
    sys_set_file,
    sys_get_file,
)

if __name__ == "__main__":

    print("Starting GPS checker thread...")

    tick = 0
    while True:

        gps_data = sys_get_variable("gps")
        if gps_data is None:
            time.sleep(5)
            continue

        gps_options = sys_get_variable("gps_options")
        if gps_options is None:
            time.sleep(5)
            continue

        all_devices = gps_options.get("devices", [])
        lat, long = gps_data.get("lat"), gps_data.get("long")
        home = gps_options.get("home", [0, 0])
        radius = gps_options.get("radius", 100)

        # check if lat,long is within radius of home
        distance = (
            math.sqrt((lat - home[0]) ** 2 + (long - home[1]) ** 2) * 111000
        )  # convert to meters

        is_home = distance <= radius
        sys_set_variables(
            "gps_status",
            {"is_home": is_home, "distance": distance},
        )

        time.sleep(1)
