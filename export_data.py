# export_data.py
import pandas as pd
import sqlite3

print("Connecting to local database...")
con = sqlite3.connect('instance/flights.db')

df = pd.read_sql_query("SELECT * from flight", con)
df.to_csv('local_flights.csv', index=False)

con.close()
print(f"Success! Exported {len(df)} flights to local_flights.csv")