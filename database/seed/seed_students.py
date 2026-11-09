"""Seed realistic students for Jain University FET into Supabase."""

import os
from supabase import create_client

FIRST_NAMES = [
    "Aarav", "Aditi", "Akash", "Ananya", "Arjun", "Bhavya", "Chetan", "Deepika",
    "Dev", "Diya", "Gaurav", "Harsh", "Isha", "Ishaan", "Kavya", "Karan",
    "Manish", "Meera", "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul",
    "Rhea", "Rishi", "Rohan", "Sanya", "Shaurya", "Sneha", "Tanvi", "Varun",
    "Vihan", "Yash", "Zoya"
]

LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Iyer", "Kumar", "Singh", "Nair", "Verma",
    "Rao", "Gupta", "Deshmukh", "Choudhury", "Bhatt", "Joshi", "Menon"
]


def seed_students():
    url = os.getenv("SUPABASE_URL", "https://wooszgwfkuzmxcinwlpj.supabase.co")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indvb3N6Z3dma3V6bXhjaW53bHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDU5ODksImV4cCI6MjEwOTgyMTk4OX0.QyB8Juk-SwsA5kEf_hPnzdQ4KX1YyUkqifXz9LccS88")
    client = create_client(url, key)

    programs = client.table("programs").select("id,code").execute().data or []
    prog_map = {p["code"]: p["id"] for p in programs}

    batches = client.table("batches").select("id,program_id,semester,section").execute().data or []
    print(f"Found {len(programs)} programs and {len(batches)} batches.")

    students = []
    # Explicitly ensure 23JU0101 is created
    aiml_id = prog_map.get("AIML")
    if aiml_id:
        students.append({
            "student_id": "23JU0101",
            "roll_number": "23JU0101",
            "full_name": "Aarav Sharma",
            "program_id": aiml_id,
            "semester": 3,
            "section": "A",
            "email": "aarav.sharma@jainuniversity.ac.in",
            "phone": "+91 98765 43210",
            "status": "active",
        })

    # Generate a curated set of ~150 students across multiple batches
    count = 102
    name_idx = 1
    for b in batches[:30]:
        prog_id = b["program_id"]
        sem = b["semester"]
        sec = b["section"]
        for i in range(5):
            roll = f"23JU{count:04d}"
            fn = FIRST_NAMES[name_idx % len(FIRST_NAMES)]
            ln = LAST_NAMES[(name_idx * 3) % len(LAST_NAMES)]
            name_idx += 1
            count += 1
            students.append({
                "student_id": roll,
                "roll_number": roll,
                "full_name": f"{fn} {ln}",
                "program_id": prog_id,
                "semester": sem,
                "section": sec,
                "email": f"{fn.lower()}.{ln.lower()}@jainuniversity.ac.in",
                "phone": f"+91 9{count:04d} {10000 + count}",
                "status": "active",
            })

    print(f"Upserting {len(students)} students into Supabase...")
    for chunk_start in range(0, len(students), 50):
        chunk = students[chunk_start:chunk_start + 50]
        client.table("students").upsert(chunk, on_conflict="roll_number").execute()

    print(f"Successfully seeded {len(students)} students!")


if __name__ == "__main__":
    seed_students()
