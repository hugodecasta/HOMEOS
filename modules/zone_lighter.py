import sys

sys.path.append(".")
import requests
from variable_server import sys_get_variable, sys_set_variables, sys_get_file
import time
import json

# region ---------------------------------------------------------------------- ZONE UTILS


def is_point_in_polygon(x, y, polygon):
    num = len(polygon)
    j = num - 1
    c = False
    for i in range(num):
        if (polygon[i][1] > y) != (polygon[j][1] > y) and (
            x
            < (polygon[j][0] - polygon[i][0])
            * (y - polygon[i][1])
            / (polygon[j][1] - polygon[i][1])
            + polygon[i][0]
        ):
            c = not c
        j = i
    return c


cached_devices = dict()


def check_zone_activation(name, zone, user_pos):

    polygon = zone["polygon"]
    devices = zone["devices"]
    options = zone.get("options", {})
    rise_time = options.get("rise_time", 0)
    fall_time = options.get("fall_time", 0)
    delay_on = options.get("delay_on", 0)
    delay_off = options.get("delay_off", 0)
    x, y = user_pos["px"], user_pos["py"]

    is_inside = is_point_in_polygon(x, y, polygon)

    adder = 1 / (rise_time + 0.001) if is_inside else -1 / (fall_time + 0.001)

    sys_set_variables(f"{name}_active", is_inside)

    for device in devices:
        var_name = f"{device}_state"

        # update cache
        if not cached_devices.get(var_name, False):
            cached_devices[var_name] = False
        cached_devices[var_name] += adder

        # update true light value
        value = cached_devices[var_name]
        if value >= 1:
            cached_devices[var_name] = 1
            sys_set_variables(var_name, True)
        elif value <= 0:
            cached_devices[var_name] = 0
            sys_set_variables(var_name, False)


# region ---------------------------------------------------------------------- ACTOR


def run():
    print("Zone lighter module started...")

    while not sys_get_variable("user_pos"):
        print("Waiting for user position variables to be initialized...")
        time.sleep(1)

    while True:
        var_user_pos = sys_get_variable("user_pos")
        var_light_zones: dict[str, dict] = json.loads(
            sys_get_file("light_zones") or "{}"
        )

        # light zones are polygones in wish the user_pos can be
        # for each polygon, check wether the user is in it or not, and set the corresponding light variables
        # var_lights_zones = {<name>: ZONE}
        # ZONE = {"devices": [<device_name>], "polygon": [(x1, y1), (x2, y2), ...], "options": OPTIONS}
        # OPTIONS = {"rise_time": 5, "fall_time": 5, "delay_on": 0, "delay_off": 0}

        # var_user_pos = {"x": 0, "y": 0}

        for zone_name, zone in var_light_zones.items():
            check_zone_activation(zone_name, zone, var_user_pos)

        sys_set_variables("light_zone_cache", cached_devices)

        time.sleep(1)


if __name__ == "__main__":
    run()
