import glob
import os
import signal
import subprocess
import sys
import threading
import time

processes = []
stop_event = threading.Event()


def stream_output(proc, proc_id, script_name, padding):
    def reader(stream):
        for line in iter(stream.readline, ""):
            if stop_event.is_set():
                break
            txt = line.rstrip("\n")
            if txt:
                print(f"[cmd{proc_id} - {script_name}] {padding}-- {txt}")
        stream.close()

    t_out = threading.Thread(target=reader, args=(proc.stdout,), daemon=True)
    t_err = threading.Thread(target=reader, args=(proc.stderr,), daemon=True)
    t_out.start()
    t_err.start()
    return [t_out, t_err]


def terminate_all():
    stop_event.set()
    for proc in processes:
        if proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass
    for proc in processes:
        if proc.poll() is None:
            try:
                proc.kill()
            except Exception:
                pass


def handle_signal(signum, frame):
    terminate_all()
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    modules_dir = os.path.join(os.path.dirname(__file__), "modules")
    files = sorted(glob.glob(os.path.join(modules_dir, "*.py")))
    files = ["variable_server.py"] + files

    threads = []
    procs = []
    max_name_size = max(len(os.path.basename(path)) for path in files) + 2
    for idx, path in enumerate(files, start=1):
        script_name = os.path.basename(path)
        proc = subprocess.Popen(
            [sys.executable, "-u", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        max_name_size = max(max_name_size, len(script_name))
        processes.append(proc)
        threads.extend(
            stream_output(
                proc, idx, script_name, "-" * (max_name_size - len(script_name))
            )
        )
        time.sleep(0.5)  # Stagger the startups a bit

    try:
        for proc in processes:
            proc.wait()
    finally:
        terminate_all()


if __name__ == "__main__":
    main()
