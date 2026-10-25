import sys

sys.path.append(".")
import requests
from variable_server import sys_get_variable, sys_set_variables
import time
import datetime

# region ---------------------------------------------------------------------- DEVICES

device_map = [
    ("Chauffage", "192.168.1.69", "plug"),
]


def get_device(name):
    for device in device_map:
        if device[0] == name:
            return device
    return None


def set_device(name, state):
    _, ip, device_type = get_device(name)
    state_str = "true" if state else "false"
    if device_type == "bulb":
        url = f"http://{ip}/rpc/CCT.Set?id=0&on={state_str}"
    elif device_type == "plug":
        url = f"http://{ip}/rpc/Switch.Set?id=0&on={state_str}"

    try:
        response = requests.get(url)
        if response.status_code == 200:
            return True
    except Exception as e:
        print(f"Failed to set device {name} state: {e}")
    return False


def gather_temp():
    url = "http://192.168.1.194/rpc/Temperature.GetStatus?id=0"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            return None
    except:
        print("No connection yet")
        return None

    json = response.json()
    temp = json.get("tC")
    print("Gathered temp:", temp, "°C")
    return temp


def switch_chauffage(switch):
    set_device("Chauffage", switch)


# region ---------------------------------------------------------------------- ACTOR


def run():

    print("Start temperature module")

    if sys_get_variable("min_temp") is None:
        sys_set_variables("min_temp", 22.5)

    if sys_get_variable("temp_link_light") is None:
        sys_set_variables("temp_link_light", "...")

    lastTemp = sys_get_variable("temperature")
    if lastTemp is None:
        lastTemp = 0

    while True:

        min_temp = sys_get_variable("min_temp")

        print("Gathering temp...")
        temperature = gather_temp()
        if temperature is None:
            temperature = lastTemp
        else:
            sys_set_variables("temp_time", datetime.datetime.now().isoformat())
            sys_set_variables("temperature", temperature)

        gps_status = sys_get_variable("gps_status")
        is_home = gps_status.get("is_home")

        linked_light = sys_get_variable("temp_link_light")

        light_on = sys_get_variable(f"{linked_light}_state")

        need_chauf = light_on and is_home and temperature < min_temp

        sys_set_variables("need_chauf", need_chauf)
        switch_chauffage(need_chauf)

        time.sleep(5)


if __name__ == "__main__":
    run()
