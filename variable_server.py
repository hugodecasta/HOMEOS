from flask import request, jsonify
import requests
from threading import Thread
import time
import json
import os

# region ---------------------------------------------------------------------- INNER SYS

PORT = 9874
var_cache = dict()

save_cache_path = "var_cache.json"
backup_cache_path = "var_cache_backup.json"


def save_thread():
    spent = 0
    while True:
        with open(save_cache_path, "w") as f:
            json.dump(var_cache, f)
        time.sleep(1)
        spent += 1
        # every hour
        if spent == 60 * 60:
            spent = 0
            with open(backup_cache_path, "w") as f:
                json.dump(var_cache, f)


def set_variables(variable: dict, value):
    var_cache[variable] = value


def get_variable(variable: str):
    return var_cache.get(variable, None)


FILES_DIR = "var_files"
os.makedirs(FILES_DIR, exist_ok=True)


def set_file(file_name: str, content: str):
    file_name = os.path.join(FILES_DIR, file_name)
    with open(file_name, "w") as f:
        f.write(content)


def get_file(file_name: str):
    file_name = os.path.join(FILES_DIR, file_name)
    if not os.path.exists(file_name):
        return None
    with open(file_name, "r") as f:
        return f.read()


# region ---------------------------------------------------------------------- EXTERNAL UTILS


def sys_get_variables():
    url = f"http://localhost:{PORT}/variables"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get all variables: {response.text}")
    except Exception as e:
        raise Exception(f"Error connecting to variable server: {e}")


def sys_get_variable(variable: str):
    url = f"http://localhost:{PORT}/variables/{variable}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(
                f"Failed to get variable {variable}-{response.status_code}: {response.text}"
            )
    except Exception as e:
        raise Exception(f"Error connecting to variable server: {e}")


def sys_get_all_variables():
    url = f"http://localhost:{PORT}/variables"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get all variables: {response.text}")


def sys_set_variables(variable: str, value: dict):
    url = f"http://localhost:{PORT}/variables/{variable}"
    response = requests.post(url, json=value)
    if response.status_code == 200:
        return True
    else:
        raise Exception(f"Failed to set variable {variable}: {response.text}")


def sys_set_file(file_name: str, content: str):
    url = f"http://localhost:{PORT}/files/{file_name}"
    response = requests.post(url, data=content.encode("utf-8"))
    if response.status_code == 200:
        return True
    else:
        raise Exception(f"Failed to set file {file_name}: {response.text}")


def sys_get_file(file_name: str):
    url = f"http://localhost:{PORT}/files/{file_name}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.text
    elif response.status_code == 404:
        return None
    else:
        raise Exception(f"Failed to get file {file_name}: {response.text}")


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
    @app.route("/variables/<variable>", methods=["GET"])
    def app_get_variable(variable):
        var = get_variable(variable)
        return jsonify(var)

    # region .... set variables for a system
    @app.route("/variables/<variable>", methods=["POST"])
    def app_set_variable(variable):
        value = request.json
        set_variables(variable, value)
        return jsonify({"message": "Variable set successfully"}), 200

    @app.route("/files/<file_name>", methods=["POST"])
    def app_set_file(file_name):
        content = request.data.decode("utf-8")
        set_file(file_name, content)
        return jsonify({"message": "File saved successfully"}), 200

    @app.route("/files/<file_name>", methods=["GET"])
    def app_get_file(file_name):
        content = get_file(file_name)
        if content is not None:
            return content, 200
        else:
            return jsonify({"message": "File not found"}), 404

    try:
        from waitress import serve

        print("INFO: Running with waitress WSGI server")
        serve(app, host="0.0.0.0", port=PORT)
    except Exception as e:
        print(
            "Could not use waitress, falling back to Flask development server. Error:",
            e,
        )
        app.run(host="0.0.0.0", port=PORT)
