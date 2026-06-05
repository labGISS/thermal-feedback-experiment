import os
from flask import Flask, jsonify, render_template
from stats import compute

app = Flask(__name__)

DB_PATH = os.environ.get("DB_PATH", "./thermal_feedback.db")


@app.route("/")
def index():
    data = compute(DB_PATH)
    return render_template("index.html", data=data)


@app.route("/api/stats")
def stats_json():
    data = compute(DB_PATH)
    return jsonify(data)


@app.route("/api/stats/<int:participant_number>")
def stats_participant(participant_number: int):
    data = compute(DB_PATH)
    participant = next(
        (p for p in data["participants"] if p["participant_number"] == participant_number),
        None,
    )
    if participant is None:
        return jsonify({"error": f"Participant {participant_number} not found"}), 404
    return jsonify(participant)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
