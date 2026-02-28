import traceback
try:
    from app.main import app
    print("OK")
except Exception as e:
    traceback.print_exc()
