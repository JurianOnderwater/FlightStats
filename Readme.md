# FlightStats ✈️

A modern, local-first Progressive Web App (PWA) to visualise, track, and analyse your personal flight history. Built with a Python Flask backend (for serving) and a dynamic JavaScript frontend, this application turns your travel data into an interactive and insightful dashboard, all while keeping your data private on your own device.



---

## ## Key Features ✨

* **Interactive Map Visualisation:** View all your flights as curved, great-circle arcs on an interactive map. Each airport is marked with a dot and its IATA code label.
* **Local-First Data Storage:** Your flight data is stored securely and privately in your browser using **IndexedDB**. Nothing is uploaded to a central server, making the app fast and offline-capable.
* **Comprehensive Statistics Dashboard:**
    * **Hero Stats:** At-a-glance view of your total flights, countries, airports, and unique routes.
    * **Distance Analytics:** See your total distance flown in km and miles, how many times you've circumnavigated the Earth, and what percentage of the journey to the moon you've completed.
    * **Time Analytics:** An estimation of your total hours, days, weeks, and months spent in the air.
    * **Top 10 Lists:** Automatically generated leaderboards for your most visited airports and most flown routes.
* **Full CRUD Functionality:** Easily **add**, **view**, **edit**, and **delete** flights from your travel history.
* **Data Portability:** **Import** and **export** your entire flight history with the click of a button using the universal CSV format.
* **Progressive Web App (PWA):** Installable on any device (desktop or mobile) for a native app-like experience, complete with offline access.
* **Modern UI/UX:** A clean, responsive interface built with Google's **Material 3** design principles, including a custom green theme.

---

## ## Tech Stack 🛠️

This project uses a modern web stack, focusing on a lightweight backend and a powerful, client-side frontend.

* **Backend:** **Python** with **Flask** (used for serving the application shell).
* **Frontend:**
    * **HTML5** & **CSS3**
    * **JavaScript (ES6+)**
    * **Leaflet.js** for the interactive 2D map.
    * **Material Web Components** for the UI.
    * **Papa Parse** for robust in-browser CSV parsing.
* **Client-Side Database:** **IndexedDB** with the `idb` library.

---

## ## Local Setup & How to Run

To get a local copy up and running, follow these simple steps.

### ### Prerequisites

* Python 3.x
* A web browser that supports modern JavaScript and IndexedDB.

### ### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/your-repository-name.git](https://github.com/your-username/your-repository-name.git)
    cd your-repository-name
    ```

2.  **Create and activate a virtual environment:**
    ```sh
    # On macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # On Windows
    py -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install the required packages:**
    The application is primarily client-side, but Flask is used to serve the files locally.
    ```sh
    pip install -r requirements.txt
    ```

4.  **Run the application:**
    ```sh
    flask run
    ```
    Your application will be available at `http://127.0.0.1:5000`.

---