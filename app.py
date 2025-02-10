from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import date
import os
import logging

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')  # Change in production
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///checklists.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

logging.basicConfig(level=logging.INFO)

class Checklist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    call_type = db.Column(db.String(50), nullable=False)
    checklist_type = db.Column(db.String(50), nullable=False)
    tasks = db.Column(db.JSON, nullable=False)
    daily_refresh = db.Column(db.Boolean, default=False)
    last_refresh = db.Column(db.String(10))

    def to_dict(self):
        return {
            'id': self.id,
            'call_type': self.call_type,
            'checklist_type': self.checklist_type,
            'tasks': self.tasks,
            'daily_refresh': self.daily_refresh,
            'last_refresh': self.last_refresh
        }

def init_db():
    with app.app_context():
        try:
            logging.info("Creating new tables (if not exist)...")
            db.create_all()
            if not Checklist.query.first():
                logging.info("No checklists found. Initializing defaults...")
                initialize_default_checklists()
                logging.info(f"Created {Checklist.query.count()} checklists")
            else:
                logging.info(f"Found {Checklist.query.count()} existing checklists")
        except Exception as e:
            logging.error(f"Error initializing database: {str(e)}")
            raise

def initialize_default_checklists():
    call_types = ["sales", "reengagement", "followup", "at-risk", "support", "introduction"]
    checklist_options = ["voicemail", "start call"]
    default_data = get_default_checklists()
    for call_type in call_types:
        for option in checklist_options:
            key = (call_type, option)
            tasks = default_data.get(key, [])
            checklist = Checklist(
                call_type=call_type,
                checklist_type=option,
                tasks=tasks,
                daily_refresh=False,
                last_refresh=date.today().isoformat()
            )
            db.session.add(checklist)
    db.session.commit()

def get_default_checklists():
    default_voicemail_tasks = [
        {'text': 'Purpose', 'done': False},
        {'text': 'Call to Action', 'done': False},
        {'text': 'Timeframe', 'done': False}
    ]
    sales_start_call_tasks = [
        {'text': 'Rapport Question', 'done': False},
        {'text': '2nd Open Question', 'done': False},
        {'text': 'Value Add Item', 'done': False},
        {'text': 'Great Ask for Sale', 'done': False},
        {'text': 'Objection', 'done': False},
        {'text': 'Implement Sale Now or "How & When"', 'done': False},
        {'text': 'Anything Else they want to Ask?', 'done': False},
        {'text': 'Summarise Call', 'done': False},
        {'text': 'Book Followup or Next Steps', 'done': False}
    ]
    introduction_start_call_tasks = [
        {'text': 'Rapport Question', 'done': False},
        {'text': '2nd Open Question', 'done': False},
        {'text': 'Value Add Item', 'done': False},
        {'text': 'Learn their Current Situation', 'done': False},
        {'text': 'Learn their Desired Situation', 'done': False},
        {'text': 'Identify their Gap (& Problem Solve or Connect to Us)', 'done': False},
        {'text': 'Additional Support Required?', 'done': False},
        {'text': 'Anything Else they want to Ask?', 'done': False},
        {'text': 'Summarise Call', 'done': False},
        {'text': 'Book Next Call or Followup Steps', 'done': False}
    ]
    followup_start_call_tasks = [
        {'text': 'Rapport Question', 'done': False},
        {'text': '2nd Open Question', 'done': False},
        {'text': 'Value Add Item', 'done': False},
        {'text': 'Extra Support Required?', 'done': False},
        {'text': 'Anything they want to Ask?', 'done': False},
        {'text': 'Summarise Call', 'done': False},
        {'text': 'Book Followup or Next Steps', 'done': False}
    ]
    support_start_call_tasks = [
        {'text': 'Rapport Question', 'done': False},
        {'text': '2nd Open Question', 'done': False},
        {'text': 'Followup on Support Given Previously', 'done': False},
        {'text': 'Value Add Item', 'done': False},
        {'text': 'Objection', 'done': False},
        {'text': 'Further Support Required?', 'done': False},
        {'text': 'Anything Else they want to Ask?', 'done': False},
        {'text': 'Summarise Call', 'done': False},
        {'text': 'Book Followup or Next Steps', 'done': False}
    ]
    at_risk_start_call_tasks = [
        {'text': 'Rapport Question', 'done': False},
        {'text': '2nd Open Question', 'done': False},
        {'text': 'Uncover the Problem', 'done': False},
        {'text': 'Problem Solve', 'done': False},
        {'text': 'Objection', 'done': False},
        {'text': 'Connect course to Motivation/Their Gap', 'done': False},
        {'text': 'Great Ask for Sale', 'done': False},
        {'text': 'Additional Support Required', 'done': False},
        {'text': 'Summarise Call', 'done': False},
        {'text': 'Book Followup or Next Steps', 'done': False}
    ]
    return {
        ("sales", "voicemail"): default_voicemail_tasks,
        ("sales", "start call"): sales_start_call_tasks,
        ("reengagement", "voicemail"): default_voicemail_tasks,
        ("reengagement", "start call"): sales_start_call_tasks,
        ("followup", "voicemail"): default_voicemail_tasks,
        ("followup", "start call"): followup_start_call_tasks,
        ("at-risk", "voicemail"): default_voicemail_tasks,
        ("at-risk", "start call"): at_risk_start_call_tasks,
        ("support", "voicemail"): default_voicemail_tasks,
        ("support", "start call"): support_start_call_tasks,
        ("introduction", "voicemail"): default_voicemail_tasks,
        ("introduction", "start call"): introduction_start_call_tasks
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/checklists', methods=['GET'])
def get_checklists():
    checklists = Checklist.query.all()
    if not checklists:
        initialize_default_checklists()
        checklists = Checklist.query.all()
    return jsonify([checklist.to_dict() for checklist in checklists])

@app.route('/api/checklist/<call_type>/<checklist_type>', methods=['GET', 'PUT'])
def handle_checklist(call_type, checklist_type):
    checklist = Checklist.query.filter_by(
        call_type=call_type,
        checklist_type=checklist_type
    ).first()
    
    if not checklist:
        default_data = get_default_checklists()
        key = (call_type, checklist_type)
        tasks = default_data.get(key, [])
        checklist = Checklist(
            call_type=call_type,
            checklist_type=checklist_type,
            tasks=tasks,
            daily_refresh=False,
            last_refresh=date.today().isoformat()
        )
        db.session.add(checklist)
        db.session.commit()
    
    if request.method == 'PUT':
        data = request.get_json()
        checklist.tasks = data['tasks']
        db.session.commit()
    
    return jsonify(checklist.to_dict())

def reset_db():
    with app.app_context():
        db.drop_all()
        db.create_all()
        initialize_default_checklists()

@app.route('/api/status')
def check_status():
    try:
        checklists = Checklist.query.all()
        return jsonify({
            'status': 'ok',
            'checklist_count': len(checklists),
            'checklists': [c.to_dict() for c in checklists]
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True)