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
    sys_get_variables,
)

# region ---------------------------------------------------------------------- SETUP

PORT = 8080
app = Flask(__name__)

# region ---------------------------------------------------------------------- FRONT

FRONT_DIR = "../front"


@app.route("/")
def front_index():
    return send_from_directory(FRONT_DIR, "index.html")


@app.route("/<path:path>")
def front_files(path):
    return send_from_directory(FRONT_DIR, path)


# region ---------------------------------------------------------------------- API


@app.route("/api/module_names", methods=["GET"])
def api_get_module_names():
    names = os.listdir("front/modules")
    names = [name[:-3] for name in names if name.endswith(".js")]
    return jsonify(names)


@app.route("/api/variables", methods=["GET"])
def api_get_variables():
    variables = sys_get_variables()
    return jsonify(variables)


@app.route("/api/variable/<variable>", methods=["GET"])
def api_get_variable(variable):
    value = sys_get_variable(variable)
    if value is None:
        return jsonify({"error": "Variable not found"}), 404
    return jsonify(value)


@app.route("/api/variable/<variable>", methods=["PUT"])
def api_set_variable(variable):
    data = request.get_json()
    value = data.get("value")
    success = sys_set_variables(variable, value)
    if not success:
        return jsonify({"error": "Variable not found"}), 404
    return jsonify({"message": "Variable updated successfully"})


@app.route("/api/files/<file_name>", methods=["PUT"])
def api_set_file(file_name):
    content = request.data.decode("utf-8")
    sys_set_file(file_name, content)
    return jsonify({"message": "File saved successfully"}), 200


@app.route("/api/files/<file_name>", methods=["GET"])
def api_get_file(file_name):
    content = sys_get_file(file_name)
    if content is not None:
        return content, 200
    else:
        return jsonify({"message": "File not found"}), 404


# region ---------------------------------------------------------------------- LAUNCH

if __name__ == "__main__":
    print(f"Running Front server @ http://localhost:{PORT}")
    try:
        from waitress import serve
        import logging

        logging.getLogger("waitress").setLevel(logging.ERROR)
        print("Running with waitress...")
        serve(app, host="0.0.0.0", port=PORT)
    except ImportError:
        print(
            "WARNING: This is a development server. Install a production WSGI server "
            "like 'waitress' and run again."
        )
        app.run(host="0.0.0.0", port=PORT)
