import sys

sys.path.append(".")
import cv2
from variable_server import sys_set_variables, sys_get_variable
import requests
import time
import math
import numpy as np
import os


def run():

    print("Starting restart module...")

    while True:

        need_restart = sys_get_variable("restart")
        if need_restart:
            print("Restarting system...")
            sys_set_variables("restart", False)
            os.system("./__restart.sh")

        time.sleep(1)


if __name__ == "__main__":
    run()
