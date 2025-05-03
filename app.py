from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for # type: ignore
from datetime import datetime
import pdfkit  # type: ignore
import os
from functools import wraps
import secrets
from flask_wtf.csrf import CSRFProtect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # Generate a secure random secret key
csrf = CSRFProtect(app)

# Security headers
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Ensure the directory for storing bills exists
if not os.path.exists("static/bills"):
    os.makedirs("static/bills")

# Temporary storage for booking details and users (replace with a database later)
bookings = []
users = {}  # In production, use a proper database

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('signin'))
        return f(*args, **kwargs)
    return decorated_function

# Session configuration
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=1800  # 30 minutes
)

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error="Page not found"), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error.html', error="Internal server error"), 500

# Routes
@app.route('/')
def index():
    return render_template('mini.html')

@app.route('/signin', methods=['GET', 'POST'])
def signin():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        # In production, use proper password hashing and database
        if email in users and users[email]['password'] == password:
            session['user'] = email
            return redirect(url_for('index'))
        return render_template('signin.html', error='Invalid credentials')
    
    return render_template('signin.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        username = request.form.get('username')
        
        if email in users:
            return render_template('signin.html', error='Email already exists')
        
        users[email] = {'password': password, 'username': username}
        session['user'] = email
        return redirect(url_for('index'))
    
    return render_template('signin.html')

@app.route('/signout')
def signout():
    session.pop('user', None)
    return redirect(url_for('index'))

@app.route('/booking')
@login_required
def booking():
    return render_template('booking.html')

@app.route('/seating')
@login_required
def seating():
    return render_template('seating.html')

@app.route('/payment')
@login_required
def payment():
    return render_template('payment.html')

@app.route('/generate-ticket', methods=['POST'])
def generate_ticket():
    data = request.json

    # Save data to the database (optional)
    # db.collection('tickets').insert_one(data)

    # Return ticket details
    return jsonify({
        "message": "Ticket generated successfully",
        "ticket": {
            "movie": data['movie'],
            "theater": data['theater'],
            "date": data['date'],
            "time": data['time'],
            "seats": data['seats'],
            "name": data['name'],
            "email": data['email'],
            "address": data['address'],
            "city": data['city'],
            "state": data['state'],
            "zipcode": data['zipcode']
        }
    })

@app.route('/confirm-payment', methods=['POST'])
@login_required
def confirm_payment():
    try:
        # Get data from the frontend
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400

        # Validate required fields
        required_fields = ['name', 'email', 'phone', 'city', 'state', 'zip', 'movie', 'theater', 'date', 'time', 'seats', 'total_price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate a unique booking ID
        booking_id = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Create booking details
        booking_details = {
            "booking_id": booking_id,
            "movie": data['movie'],
            "theater": data['theater'],
            "date": data['date'],
            "time": data['time'],
            "seats": data['seats'],
            "total_price": data['total_price'],
            "name": data['name'],
            "email": data['email'],
            "phone": data['phone'],
            "city": data['city'],
            "state": data['state'],
            "zip_code": data['zip'],
            "payment_method": data.get('payment_method', 'upi'),
            "booking_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

        # Save booking details (temporary storage)
        bookings.append(booking_details)

        # Generate a bill (PDF)
        bill_filename = generate_bill_pdf(booking_details)

        # Store booking details in session for the confirmation page
        session['current_booking'] = booking_details

        # Return success response with redirect URL
        return jsonify({
            "message": "Payment successful!",
            "redirect_url": url_for('payment_confirmation'),
            "bill_url": f"/download-bill/{bill_filename}"
        })

    except Exception as e:
        logger.error(f"Payment confirmation error: {str(e)}")
        return jsonify({'error': 'An error occurred during payment confirmation'}), 500

@app.route('/payment-confirmation')
@login_required
def payment_confirmation():
    booking = session.get('current_booking')
    if not booking:
        return redirect(url_for('index'))
    
    # Clear the booking from session after displaying
    session.pop('current_booking', None)
    
    return render_template('payment_confirmation.html',
                         booking_id=booking['booking_id'],
                         movie_name=booking['movie'],
                         show_time=booking['time'],
                         seats=', '.join(booking['seats']),
                         booking_date=booking['date'],
                         total_amount=booking['total_price'])

def generate_bill_pdf(booking_details):
    try:
        # Create a unique filename for the bill
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"bill_{timestamp}.pdf"
        filepath = os.path.join("static", "bills", filename)

        # HTML content for the bill
        html_content = f"""
        <h1>Movie Ticket Booking - Bill</h1>
        <p><strong>Booking ID:</strong> {booking_details['booking_id']}</p>
        <p><strong>Name:</strong> {booking_details['name']}</p>
        <p><strong>Email:</strong> {booking_details['email']}</p>
        <p><strong>Phone:</strong> {booking_details['phone']}</p>
        <p><strong>Address:</strong> {booking_details['city']}, {booking_details['state']} - {booking_details['zip_code']}</p>
        <p><strong>Movie:</strong> {booking_details['movie']}</p>
        <p><strong>Theater:</strong> {booking_details['theater']}</p>
        <p><strong>Date:</strong> {booking_details['date']}</p>
        <p><strong>Time:</strong> {booking_details['time']}</p>
        <p><strong>Seats:</strong> {', '.join(booking_details['seats'])}</p>
        <p><strong>Total Price:</strong> ₹{booking_details['total_price']}</p>
        """

        # Generate PDF using pdfkit
        pdfkit.from_string(html_content, filepath)
        return filename
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        return None

@app.route('/download-bill/<filename>')
@login_required
def download_bill(filename):
    try:
        # Serve the generated bill as a downloadable file
        return send_file(f"static/bills/{filename}", as_attachment=True)
    except Exception as e:
        logger.error(f"Error downloading bill: {str(e)}")
        return redirect(url_for('payment_confirmation'))

# Run the application
if __name__ == '__main__':
    app.run(debug=True)