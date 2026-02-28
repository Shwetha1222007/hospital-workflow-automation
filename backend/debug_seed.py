import traceback, sys
sys.stdout.reconfigure(encoding='utf-8')
try:
    import seed as s
    s.seed()
except Exception:
    traceback.print_exc()
