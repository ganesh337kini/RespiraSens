"""Legacy entrypoint — use `train_advanced.py` for the full calibrated pipeline."""

from pathlib import Path
import subprocess
import sys

if __name__ == "__main__":
    advanced = Path(__file__).resolve().parent / "train_advanced.py"
    sys.exit(subprocess.call([sys.executable, str(advanced)]))
