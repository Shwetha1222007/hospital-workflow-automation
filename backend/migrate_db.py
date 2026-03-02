"""
Safe migration script — adds missing columns to existing tables
and creates new tables (medications, bills).
Run once: python migrate_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text, inspect as sa_inspect

insp = sa_inspect(engine)

def col_exists(table, col):
    cols = [c['name'] for c in insp.get_columns(table)]
    return col in cols

def table_exists(table):
    return table in insp.get_table_names()

with engine.connect() as conn:

    # ── patients: add nurse_id ────────────────────────────────────────────────
    if not col_exists('patients', 'nurse_id'):
        conn.execute(text("ALTER TABLE patients ADD COLUMN nurse_id INTEGER REFERENCES nurses(id)"))
        print("✅ patients.nurse_id added")
    else:
        print("✓  patients.nurse_id already exists")

    # ── patients: add created_by ──────────────────────────────────────────────
    if not col_exists('patients', 'created_by'):
        conn.execute(text("ALTER TABLE patients ADD COLUMN created_by INTEGER REFERENCES users(id)"))
        print("✅ patients.created_by added")
    else:
        print("✓  patients.created_by already exists")

    # ── workflow_logs: add is_late, resolved ─────────────────────────────────
    if table_exists('workflow_logs'):
        if not col_exists('workflow_logs', 'is_late'):
            conn.execute(text("ALTER TABLE workflow_logs ADD COLUMN is_late BOOLEAN DEFAULT 0"))
            print("✅ workflow_logs.is_late added")
        if not col_exists('workflow_logs', 'resolved'):
            conn.execute(text("ALTER TABLE workflow_logs ADD COLUMN resolved BOOLEAN DEFAULT 0"))
            print("✅ workflow_logs.resolved added")
        if not col_exists('workflow_logs', 'updated_by'):
            conn.execute(text("ALTER TABLE workflow_logs ADD COLUMN updated_by INTEGER REFERENCES users(id)"))
            print("✅ workflow_logs.updated_by added")
        if not col_exists('workflow_logs', 'assigned_user_id'):
            conn.execute(text("ALTER TABLE workflow_logs ADD COLUMN assigned_user_id INTEGER REFERENCES users(id)"))
            print("✅ workflow_logs.assigned_user_id added")
    else:
        print("⚠️  workflow_logs table not found – will be created by SQLAlchemy")

    # ── New workflow stage enum values (SQLite stores as text, no migration needed)
    print("✓  SQLite stores enums as text — no enum migration needed")

    conn.commit()

# Now let SQLAlchemy create any completely new tables
from app.models.user       import User       # noqa
from app.models.doctor     import Doctor     # noqa
from app.models.nurse      import Nurse      # noqa
from app.models.patient    import Patient    # noqa
from app.models.lab_report import LabReport  # noqa
from app.models.workflow   import WorkflowLog # noqa
from app.models.billing    import Medication, Bill  # noqa
from app.database import Base

Base.metadata.create_all(bind=engine, checkfirst=True)
print("✅ All new tables created (medications, bills, etc.)")

print("\n🎉 Migration complete! Restart uvicorn and test again.")
