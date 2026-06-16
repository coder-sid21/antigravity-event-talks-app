import os
import xml.etree.ElementTree as ET
import urllib.request
import time
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache for the release notes
FEED_CACHE = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 300  # 5 minutes
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    if not force_refresh and FEED_CACHE["data"] and (now - FEED_CACHE["last_fetched"] < CACHE_DURATION_SECS):
        return FEED_CACHE["data"]

    # Fetch feed
    req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'BigQuery-Release-Pulse/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
    except Exception as e:
        # If fetch fails, return cached data if available, otherwise raise error
        if FEED_CACHE["data"]:
            return FEED_CACHE["data"]
        raise Exception(f"Failed to fetch feed: {str(e)}")

    try:
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = []

        for entry_node in root.findall('atom:entry', ns):
            title_node = entry_node.find('atom:title', ns)
            id_node = entry_node.find('atom:id', ns)
            updated_node = entry_node.find('atom:updated', ns)
            content_node = entry_node.find('atom:content', ns)
            link_node = entry_node.find('atom:link[@rel="alternate"]', ns)

            title = title_node.text if title_node is not None else ""
            entry_id = id_node.text if id_node is not None else ""
            updated = updated_node.text if updated_node is not None else ""
            content = content_node.text if content_node is not None else ""
            link = link_node.attrib.get('href') if link_node is not None else ""

            entries.append({
                "id": entry_id,
                "title": title,
                "updated": updated,
                "content": content,
                "link": link
            })

        FEED_CACHE["data"] = entries
        FEED_CACHE["last_fetched"] = now
        return entries
    except Exception as e:
        if FEED_CACHE["data"]:
            return FEED_CACHE["data"]
        raise Exception(f"Failed to parse feed XML: {str(e)}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        notes = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "data": notes,
            "cached": not force_refresh and (time.time() - FEED_CACHE["last_fetched"] > 0)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
