from flask import request, jsonify
import requests
from threading import Thread
import time
import json

# region ---------------------------------------------------------------------- INNER SYS

PORT = 9874
var_cache = dict()

save_cache_path = "var_cache.json"


def save_thread():
    while True:
        with open(save_cache_path, "w") as f:
            json.dump(var_cache, f)
        time.sleep(1)


def set_variables(system_name: str, variables: dict):
    if not system_name in var_cache:
        var_cache[system_name] = {}
    for var_name, var_value in variables.items():
        var_cache[system_name][var_name] = var_value


def get_system_variables(system_name: str):
    if system_name in var_cache:
        return var_cache[system_name]
    else:
        return dict()


# region ---------------------------------------------------------------------- EXTERNAL UTILS


def sys_get_variables(system_name: str):
    url = f"http://localhost:{PORT}/variables/{system_name}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(
            f"Failed to get variables for system {system_name}-{response.status_code}: {response.text}"
        )


def sys_get_all_variables():
    url = f"http://localhost:{PORT}/variables"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get all variables: {response.text}")


def sys_set_variables(system_name: str, variables: dict):
    url = f"http://localhost:{PORT}/variables/{system_name}"
    response = requests.post(url, json=variables)
    if response.status_code == 200:
        return True
    else:
        raise Exception(
            f"Failed to set variables for system {system_name}: {response.text}"
        )


# region ---------------------------------------------------------------------- SERVER

if __name__ == "__main__":

    # Start the save thread
    var_cache = dict()
    try:
        with open(save_cache_path, "r") as f:
            var_cache = json.load(f)
    except FileNotFoundError:
        pass
    Thread(target=save_thread, daemon=True).start()

    # region .... app setup
    from flask import Flask

    app = Flask(__name__)

    # region .... get all variables
    @app.route("/variables", methods=["GET"])
    def app_get_all_variables():
        return jsonify(var_cache)

    # region .... get specific system variables
    @app.route("/variables/<system_name>", methods=["GET"])
    def app_get_system_variables(system_name):
        variables = get_system_variables(system_name)
        return jsonify(variables)

    # region .... set variables for a system
    @app.route("/variables/<system_name>", methods=["POST"])
    def app_set_system_variables(system_name):
        variables = request.json
        set_variables(system_name, variables)
        return jsonify({"message": "Variables set successfully"}), 200

    try:
        from waitress import serve

        print("INFO: Running with waitress WSGI server")
        serve(app, host="0.0.0.0", port=PORT)
    except ImportError:
        print(
            "WARNING: This is a development server. Install a production WSGI server "
            "like 'waitress' and run again."
        )
        app.run(host="0.0.0.0", port=PORT)
