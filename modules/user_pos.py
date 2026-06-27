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
        if user_detection is None or len(user_detection) == 0:
            time.sleep(1)
            continue

        sent_users = []

        for i, user in enumerate(user_detection):

            act_user_id = i
            x, y = user.get("x"), user.get("y")

            # region ... resolve true user
            for user_id, user_info in known_user.items():
                dx = user_info["x"] - x
                dy = user_info["y"] - y
                distance = (dx**2 + dy**2) ** 0.5
                if distance < 0.5:
                    act_user_id = user_id
                    break

            if not act_user_id in known_user:
                known_user[act_user_id] = {"x": x, "y": y, "history": [(x, y)]}
            else:

                # region ... get actual x,y
                history = known_user[act_user_id]["history"]
                history.append((x, y))
                if len(history) > MA:
                    history.pop(0)
                act_x, act_y = moving_average(np.array(history), window_size=MA)
                px = known_user[act_user_id]["x"]
                py = known_user[act_user_id]["y"]
                dx = act_x - px
                dy = act_y - py

                dx *= SPEED
                dy *= SPEED

                known_user[act_user_id]["x"] = act_x
                known_user[act_user_id]["y"] = act_y

                user_data = dict(x=act_x, y=act_y, dx=dx, dy=dy, time=time.time())
                sent_users.append(user_data)

        sys_set_variables("user_pos", sent_users)

        time.sleep(0.33)


# region ---------------------------------------------------------------------- LAUNCH


if __name__ == "__main__":
    run()
