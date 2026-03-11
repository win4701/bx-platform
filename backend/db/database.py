import sqlite3

db = sqlite3.connect("bloxio.db", check_same_thread=False)
db.row_factory = sqlite3.Row
