# FlightStats ✈️

A modern, local-first Progressive Web App (PWA) to visualise, track, and analyse your personal flight history. Built with a Python Flask backend (for serving) and a dynamic JavaScript frontend, this website turns your travel data into an interactive and insightful dashboard.



---

## ## Key Features ✨

* **Interactive Map Visualisation:** View all your flights on an interactive map. Each airport is marked with its IATA code.
* **Local-First Data Storage:** Your flight data is stored only in your browser using **IndexedDB**. Nothing is uploaded to a central server.
* **Data Portability:** **Import** and **export** your entire flight history as csv files.
* **Statistics Dashboard:**
    * **Hero Stats:** At-a-glance view of your total flights, countries, airports, and unique routes.
    * **Distance Stats:** See your total distance flown in km and miles, how many times you've circumnavigated the Earth, and what percentage of the journey to the moon you've completed.
    * **Time Stats:** An estimation of your total hours, days, weeks, and months spent in the air.
    * **Top 10 Lists:** Automatically generated leaderboards for your most visited airports and most flown routes.

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

## ## Non-local usage
* Website is available [here](https://flightstats-app.onrender.com/)
* Or not, used the free plan at render so it might be expired