import glob
import os
import signal
import subprocess
import sys
import threading

processes = []
stop_event = threading.Event()


def stream_output(proc, proc_id):
    def reader(stream):
        for line in iter(stream.readline, ""):
            if stop_event.is_set():
                break
            txt = line.rstrip("\n")
            if txt:
                print(f"[cmd{proc_id}] {txt}")
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

    threads = []
    for idx, path in enumerate(files, start=1):
        proc = subprocess.Popen(
            [sys.executable, "-u", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        processes.append(proc)
        threads.extend(stream_output(proc, idx))

    try:
        for proc in processes:
            proc.wait()
    finally:
        terminate_all()


if __name__ == "__main__":
    main()
