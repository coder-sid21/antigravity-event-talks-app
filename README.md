# BigQuery Release Pulse

An elegant, modern, and high-performance web dashboard built to aggregate, search, and share Google Cloud BigQuery release updates. 

This application parses the official Google Cloud BigQuery Atom release feed and splits combined daily release notes into modular, individually searchable cards. It also features a custom-built Twitter/X Composer complete with a real-time post preview mockup to quickly share updates with your network.

---

## ✨ Features

- **Granular Feed Splitting:** Parses the combined dates in the feed and breaks them down into individual, categorized cards (e.g. *Feature*, *Issue*, *Deprecation*) for easier browsing and sharing.
- **Interactive Analytics Stats:** Quick metrics dashboard showing current numbers for total changes, features, issues, and deprecations (equipped with custom count-up animations).
- **Instant Search & Filter Pills:** Filter updates dynamically by keyword search or category type.
- **Compose & Tweet Integration:** 
  - Click the Twitter icon on any update card to draft a formatted update post.
  - Check multiple update cards to compile a joint summary tweet.
  - Live X (Twitter) user-interface mockup showing exactly how the post will look on feed.
  - Integrated circular character count progress tracker (280 limit boundary).
  - Quick addition tools for hashtags (`#BigQuery #GoogleCloud`), documentation links, and randomized dev emojis.

---

## 🛠️ Tech Stack

- **Backend:** Python (Flask)
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Design System:** Custom slate dark-mode palette, glassmorphism cards, blur effects, CSS variables, and Outfit/Inter/JetBrains Mono typography.
- **Icons:** FontAwesome (v6)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python installed on your system.

### Running the Application

1. **Navigate to the project directory:**
   ```powershell
   cd bigquery-release-pulse
   ```

2. **Run the Flask server:**
   ```powershell
   python app.py
   ```

3. **Open in browser:**
   Open your web browser and navigate to:
   👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📂 Project Structure

```text
bigquery-release-pulse/
│
├── static/
│   ├── app.js       # Frontend UI interaction, parsing, & tweet compositor
│   └── style.css    # Custom dark-theme variables, glass cards, & animations
│
├── templates/
│   └── index.html   # Main dashboard layout structure
│
├── .gitignore       # Git exclusion patterns
├── README.md        # Project documentation
└── app.py           # Flask server & feed cache endpoint
```

---

## 🔒 Feed Caching
To prevent making excessive requests to the Google Cloud feed server, the backend application implements a lightweight in-memory cache that updates every 5 minutes. You can force a fresh feed fetch by clicking the **Refresh Feed** button in the dashboard, which appends a `?refresh=true` parameter to the API request.
