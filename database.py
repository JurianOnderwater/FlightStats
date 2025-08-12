# database.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Flight(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    origin = db.Column(db.String(3), nullable=False)
    destination = db.Column(db.String(3), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    distance = db.Column(db.Float, nullable=False)


def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
