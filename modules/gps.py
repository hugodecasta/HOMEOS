import sys

sys.path.append(".")
from flask import Flask, request, jsonify, send_from_directory
import requests
import json
import time
import threading
import os
from variable_server import (
    sys_get_variable,
    sys_set_variables,
    sys_set_file,
    sys_get_file,
)

# region ---------------------------------------------------------------------- SETUP

PORT = 3214
app = Flask(__name__)


# region ---------------------------------------------------------------------- API


@app.route("/gps_ping", methods=["POST"])
def api_gps_ping():
    # get body json data {lat,long,time}
    data = request.get_json()
    lat = data.get("lat")
    long = data.get("long")
    timestamp = data.get("time")
    sys_set_variables("gps", {"lat": lat, "long": long, "time": timestamp})
    return jsonify({"message": "GPS ping received successfully"})


# region ---------------------------------------------------------------------- LAUNCH

if __name__ == "__main__":
    print(f"Running GPS server @ http://localhost:{PORT}")
    try:
        from waitress import serve

        print("Running with waitress...")
        serve(app, host="0.0.0.0", port=PORT)
    except ImportError:
        print(
            "WARNING: This is a development server. Install a production WSGI server "
            "like 'waitress' and run again."
        )
        app.run(host="0.0.0.0", port=PORT)
