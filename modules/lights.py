import sys

sys.path.append(".")
import requests
from variable_server import sys_get_variable, sys_set_variables
import time

# region ---------------------------------------------------------------------- DEVICES

device_map = [
    ("Ordi", "192.168.1.46", "plug"),
    ("BuffetSalon", "192.168.1.7", "plug"),
    ("BuffetEntree", "192.168.1.75", "plug"),
    ("Entree", "192.168.1.145", "bulb"),
    ("Cuisine", "192.168.1.179", "bulb"),
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


# region ---------------------------------------------------------------------- ACTOR


def run():
    print("Starting lights module...")

    for device_name, _, _ in device_map:
        var_name = f"{device_name}_state"
        if sys_get_variable(var_name) is None:
            sys_set_variables(var_name, False)

    caches = dict()
    caches[var_name] = False
    while True:
        for device_name, _, _ in device_map:
            # if device_name == "Ordi":
            #     continue
            var_name = f"{device_name}_state"
            required_value = sys_get_variable(var_name)
            if var_name in caches and caches[var_name] == required_value:
                continue
            caches[var_name] = required_value
            set_device(device_name, required_value)
        time.sleep(1)


if __name__ == "__main__":
    run()
