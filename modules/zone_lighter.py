import sys

sys.path.append(".")
import requests
from variable_server import sys_get_variable, sys_set_variables, sys_get_file
import time
import json
import numpy as np

# region ---------------------------------------------------------------------- ZONE UTILS

FPS = 60
timer = 1 / FPS


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


# cached_devices = dict()


# def check_zone_activation(name, zone, user_pos):

#     polygon = zone["polygon"]
#     devices = zone["devices"]
#     options = zone.get("options", {})
#     rise_time = options.get("rise_time", 0)
#     fall_time = options.get("fall_time", 0)
#     delay_on = options.get("delay_on", 0)
#     delay_off = options.get("delay_off", 0)
#     x, y = user_pos["px"], user_pos["py"]

#     is_inside = is_point_in_polygon(x, y, polygon)

#     adder = timer / (rise_time + 0.001) if is_inside else -timer / (fall_time + 0.001)

#     sys_set_variables(f"{name}_active", is_inside)

#     for device in devices:
#         var_name = f"{device}_state"

#         # update cache
#         if not cached_devices.get(var_name, False):
#             cached_devices[var_name] = False
#         cached_devices[var_name] += adder

#         # update true light value
#         value = cached_devices[var_name]
#         if value >= 1:
#             cached_devices[var_name] = 1
#             sys_set_variables(var_name, True)
#         elif value <= 0:
#             cached_devices[var_name] = 0
#             sys_set_variables(var_name, False)


def create_zone_adder(name, zone, user):

    polygon = zone["polygon"]
    devices = zone["devices"]
    options = zone.get("options", {})
    rise_time = options.get("rise_time", 0)
    fall_time = options.get("fall_time", 0)
    delay_on = options.get("delay_on", 0)
    delay_off = options.get("delay_off", 0)

    x, y = user["x"], user["y"]
    dx, dy = user.get("dx", 0), user.get("dy", 0)
    x2 = x + dx
    y2 = y + dy

    line_resolution = 20
    line = np.linspace((x, y), (x2, y2), line_resolution)

    is_inside = any(is_point_in_polygon(px, py, polygon) for px, py in line)
    sys_set_variables(f"{name}_active", is_inside)

    adder = timer / (rise_time + 0.001) if is_inside else -timer / (fall_time + 0.001)

    return {device: adder for device in devices}


def create_zones_adder(zones, users):

    adders = dict()

    for user in users:
        for name, zone in zones.items():
            devices_adders = create_zone_adder(name, zone, user)
            for device, adder in devices_adders.items():
                if device not in adders:
                    adders[device] = adder
                else:
                    adders[device] = max(adder, adders[device])

    return adders


cached_devices = dict()


def apply_adders(adders):

    for device, adder in adders.items():
        if not device in cached_devices:
            cached_devices[device] = 0
        cached_devices[device] += adder

        sys_name = f"{device}_state"
        value = cached_devices[device]
        if value >= 1:
            cached_devices[device] = 1
            sys_set_variables(sys_name, True)
        elif value <= 0:
            cached_devices[device] = 0
            sys_set_variables(sys_name, False)


# region ---------------------------------------------------------------------- ACTOR


def run():
    print("Zone lighter module started...")

    while not sys_get_variable("user_pos"):
        print("Waiting for user position variables to be initialized...")
        time.sleep(1)

    while True:
        var_user_pos = sys_get_variable("user_pos")
        if var_user_pos is None:
            time.sleep(1)
            continue
        var_light_zones: dict[str, dict] = json.loads(
            sys_get_file("light_zones") or "{}"
        )

        # light zones are polygones in wish the user_pos can be
        # for each polygon, check wether the user is in it or not, and set the corresponding light variables
        # var_lights_zones = {<name>: ZONE}
        # ZONE = {"devices": [<device_name>], "polygon": [(x1, y1), (x2, y2), ...], "options": OPTIONS}
        # OPTIONS = {"rise_time": 5, "fall_time": 5, "delay_on": 0, "delay_off": 0}

        # var_user_pos = {"x": 0, "y": 0}

        adders = create_zones_adder(var_light_zones, var_user_pos)
        apply_adders(adders)

        sys_set_variables("light_zone_cache", cached_devices)

        time.sleep(timer)


if __name__ == "__main__":
    run()
