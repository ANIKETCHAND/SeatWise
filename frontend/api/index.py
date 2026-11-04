import os
import sys

# Ensure current directory is on sys.path so 'app' is importable directly
base_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(base_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.main import app
