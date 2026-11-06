import json
import os
import hashlib
import uuid
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PORT = int(os.environ.get("PORT", "3000"))

def data_path(name):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
    return path

def read_data(name):
    with open(data_path(name), "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_data(name, rows):
    with open(data_path(name), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def send_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/dashboard":
            email = parse_qs(parsed.query).get("email", [""])[0].lower()
            bookings = [x for x in read_data("bookings.json") if not email or x.get("parkerEmail") == email]
            spaces = [x for x in read_data("parking_spaces.json") if not email or x.get("hostEmail") == email]
            return self.send_json(200, {"bookings": bookings, "spaces": spaces})
        return super().do_GET()

    def do_POST(self):
        route = urlparse(self.path).path
        routes = {
            "/api/users": ("users.json", self.create_user),
            "/api/spaces": ("parking_spaces.json", self.create_space),
            "/api/bookings": ("bookings.json", self.create_booking),
        }
        if route not in routes:
            return self.send_json(404, {"error": "API route not found."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 1_000_000:
                return self.send_json(413, {"error": "Request is too large."})
            payload = json.loads(self.rfile.read(length) or b"{}")
            filename, handler = routes[route]
            rows = read_data(filename)
            result = handler(payload, rows)
            if isinstance(result, tuple):
                status, body = result
            else:
                status, body = 201, result
            if status < 300:
                write_data(filename, rows)
            return self.send_json(status, body)
        except (ValueError, TypeError, KeyError) as exc:
            return self.send_json(400, {"error": str(exc) or "Invalid request."})
        except Exception:
            return self.send_json(500, {"error": "The server could not save this submission."})

    def create_user(self, p, rows):
        name = str(p.get("name", "")).strip()
        email = str(p.get("email", "")).strip().lower()
        phone = str(p.get("phone", "")).strip()
        password = str(p.get("password", ""))
        role = p.get("role")
        if len(name) < 2 or "@" not in email or len(password) < 8:
            raise ValueError("Please provide a valid name, email and password (8+ characters).")
        if role not in ("parker", "host", "both"):
            raise ValueError("Choose Parker, Host or Both.")
        if any(x.get("email") == email for x in rows):
            return 409, {"error": "An account with this email already exists."}
        user = {"id": "USR-" + uuid.uuid4().hex[:8].upper(), "name": name, "email": email,
                "phone": phone, "role": role, "createdAt": datetime.now().isoformat(timespec="seconds")}
        # Store a one-way hash for this classroom demo; never store the raw password.
        user["passwordHash"] = hashlib.sha256(password.encode("utf-8")).hexdigest()
        rows.append(user)
        return {"user": {k:v for k,v in user.items() if k != "passwordHash"}, "message": "Account created."}

    def create_space(self, p, rows):
        title, address = str(p.get("title", "")).strip(), str(p.get("address", "")).strip()
        price = float(p.get("price", 0))
        if not title or not address or price <= 0 or price > 10000:
            raise ValueError("Enter a space name, address and a valid hourly price.")
        space = {"id": "SP-" + uuid.uuid4().hex[:8].upper(), "title": title, "address": address,
                 "type": str(p.get("type", "")), "price": price,
                 "amenities": p.get("amenities", []), "hostEmail": str(p.get("hostEmail", "")).lower(),
                 "createdAt": datetime.now().isoformat(timespec="seconds")}
        rows.append(space)
        return {"space": space, "message": "Space saved."}

    def create_booking(self, p, rows):
        space = str(p.get("space", "")).strip()
        slot = str(p.get("slot", "")).strip()
        rate, duration = float(p.get("rate", 0)), float(p.get("durationHours", 0))
        if not space or not slot or rate <= 0 or duration <= 0:
            raise ValueError("Select a parking space and available slot.")
        booking = {"id": "POB-" + uuid.uuid4().hex[:8].upper(), "space": space, "slot": slot,
                   "date": str(p.get("date", "")), "checkin": str(p.get("checkin", "")),
                   "checkout": str(p.get("checkout", "")), "durationHours": duration,
                   "rate": rate, "total": round(rate * duration, 2),
                   "parkerEmail": str(p.get("parkerEmail", "")).lower(),
                   "status": "Confirmed", "createdAt": datetime.now().isoformat(timespec="seconds")}
        rows.append(booking)
        return {"booking": booking, "message": "Booking saved."}

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    for filename in ("users.json", "bookings.json", "parking_spaces.json"):
        data_path(filename)
    print("=" * 54)
    print("PARK-O-BUDDY — local evaluation server")
    print(f"Open http://localhost:{PORT}")
    print("Submitted forms are stored in the ./data/ JSON files.")
    print("Press Ctrl+C to stop.")
    print("=" * 54)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
