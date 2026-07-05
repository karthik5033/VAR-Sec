from app.database import SessionLocal, engine
from app.models import Base, ScanResult
from sqlalchemy import text

def clear_data():
    db = SessionLocal()
    try:
        # Check if table exists
        db.query(ScanResult).delete()
        db.commit()
        print("Successfully cleared all ScanResult data.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
