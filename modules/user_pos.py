import sys

sys.path.append(".")
from variable_server import sys_set_variables, sys_get_variable
import time
import numpy as np

# region ---------------------------------------------------------------------- UTILS


def moving_average(data, window_size=5):
    if len(data) < window_size:
        return data[-1]
    return np.mean(data[-window_size:], axis=0)


# region ---------------------------------------------------------------------- RUN


def run():

    print("Starting user position module...")

    last_detection_time = 0

    MA = 7
    SPEED = 3

    known_user = dict()

    while True:

        # region ... aquire detections
        user_detection = sys_get_variable("user_detection")
        room_bounds = sys_get_variable("user_pos_room_bound")
        if user_detection is None or len(user_detection) == 0:
            time.sleep(1)
            continue
        if room_bounds is None:
            time.sleep(1)
            continue
        room_x_min, room_x_max = room_bounds.get("x")
        room_y_min, room_y_max = room_bounds.get("y")

        sent_users = []

        for i, user in enumerate(user_detection):

            act_user_id = i
            x, y, detect_time = user.get("x"), user.get("y"), user.get("time")

            # region ... resolve true user
            for user_id, user_info in known_user.items():
                dx = user_info["x"] - x
                dy = user_info["y"] - y
                distance = (dx**2 + dy**2) ** 0.5
                if distance < 0.5:
                    act_user_id = user_id
                    break

            if not act_user_id in known_user:
                known_user[act_user_id] = {
                    "x": x,
                    "y": y,
                    "dx": 0,
                    "dy": 0,
                    "history": [(x, y)],
                    "lst": detect_time,
                    "ndu": 0,
                }
            else:

                px = known_user[act_user_id]["x"]
                py = known_user[act_user_id]["y"]
                dx = known_user[act_user_id]["dx"]
                dy = known_user[act_user_id]["dy"]
                pdx = px + dx
                pdy = py + dy
                pts = [(pdx, pdy)]

                last_detect_time = known_user[act_user_id]["lst"]
                detection_occured = last_detect_time != detect_time
                ndu = known_user[act_user_id]["ndu"]

                pts = [(x, y)]

                # if detection_occured:
                #     pts = [(x, y)]
                #     ndu = 20
                # else:
                #     if ndu <= 0:
                #         ndu = 0
                #         # pts = [(x, y)]
                #     else:
                #         ndu -= 1

                # region ... history
                history = known_user[act_user_id]["history"]
                for x, y in pts:
                    history.append((x, y))
                if len(history) > MA:
                    history.pop(0)

                # region ... get current
                act_x, act_y = moving_average(np.array(history), window_size=MA)
                if act_x < room_x_min:
                    act_x = room_x_min
                if act_x > room_x_max:
                    act_x = room_x_max
                if act_y < room_y_min:
                    act_y = room_y_min
                if act_y > room_y_max:
                    act_y = room_y_max

                # region ... diff + speed
                px = known_user[act_user_id]["x"]
                py = known_user[act_user_id]["y"]
                dx = act_x - px
                dy = act_y - py

                dx *= SPEED
                dy *= SPEED

                known_user[act_user_id]["x"] = act_x
                known_user[act_user_id]["y"] = act_y
                known_user[act_user_id]["dx"] = dx
                known_user[act_user_id]["dy"] = dy
                known_user[act_user_id]["lst"] = detect_time
                known_user[act_user_id]["ndu"] = ndu

                user_data = dict(
                    x=act_x,
                    y=act_y,
                    dx=dx,
                    dy=dy,
                    time=time.time(),
                    no_detection=not detection_occured,
                )

                sent_users.append(user_data)

        sys_set_variables("user_pos", sent_users)

        time.sleep(0.33)


# region ---------------------------------------------------------------------- LAUNCH


if __name__ == "__main__":
    run()
