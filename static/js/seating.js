// Select elements
const container = document.querySelector('.container');
const seats = document.querySelectorAll('.row .seat:not(.occupied)');
const count = document.getElementById('count');
const price = document.getElementById('price');

let ticketPrice = 200.65; // Default ticket price

// Update selected seats count and price
function updateSelectedSeatsCount() {
    const selectedSeats = document.querySelectorAll('.row .seat.selected');
    const seatsIndex = [...selectedSeats].map(seat => [...seats].indexOf(seat));

    // Save selected seats to sessionStorage if available
    if (typeof Storage !== 'undefined') {
        sessionStorage.setItem('selectedSeats', JSON.stringify(seatsIndex));
    }

    const selectedSeatsCount = selectedSeats.length;
    count.innerText = selectedSeatsCount;
    price.innerText = (selectedSeatsCount * ticketPrice).toFixed(2); // Format to 2 decimal places
}

// Populate UI from sessionStorage on page load
function populateUI() {
    if (typeof Storage !== 'undefined') {
        const selectedSeats = JSON.parse(sessionStorage.getItem('selectedSeats'));

        if (selectedSeats && selectedSeats.length > 0) {
            seats.forEach((seat, index) => {
                if (selectedSeats.indexOf(index) > -1) {
                    seat.classList.add('selected');
                }
            });
        }

        updateSelectedSeatsCount();
    } else {
        alert('Session storage is not supported in your browser.');
    }
}

// Seat click event
container.addEventListener('click', e => {
    if (e.target.classList.contains('seat') && !e.target.classList.contains('occupied')) {
        e.target.classList.toggle('selected');
        updateSelectedSeatsCount();
    }
});

// Confirm booking and redirect to payment page
function confirmBooking() {
    // Get the selected seats
    const selectedSeats = document.querySelectorAll('.row .seat.selected');
    
    if (selectedSeats.length === 0) {
        alert('Please select at least one seat before proceeding.');
        return;
    }

    try {
        // Get the row and seat numbers for each selected seat
        const seatNumbers = Array.from(selectedSeats).map(seat => {
            const row = seat.parentElement.parentElement.querySelector('.row-label')?.textContent || 'Row';
            const seatIndex = Array.from(seat.parentElement.children).indexOf(seat) + 1;
            return `${row}${seatIndex}`;
        });
        
        // Get booking details from sessionStorage
        const bookingDetails = JSON.parse(sessionStorage.getItem('bookingDetails') || '{}');
        
        if (!bookingDetails.movie || !bookingDetails.theater || !bookingDetails.date || !bookingDetails.time) {
            alert('Booking details not found. Please go back to the booking page.');
            window.location.href = '/booking';
            return;
        }
        
        // Add seats and total price to booking details
        bookingDetails.seats = seatNumbers;
        bookingDetails.total_price = (selectedSeats.length * ticketPrice).toFixed(2);
        
        // Save updated booking details to sessionStorage
        sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDetails));
        
        // Redirect to payment page
        window.location.href = '/payment';
    } catch (error) {
        console.error('Error confirming booking:', error);
        alert('An error occurred while confirming your booking. Please try again.');
    }
}

// Validate booking details from sessionStorage
function validateBookingDetails() {
    if (typeof Storage !== 'undefined') {
        try {
            const bookingDetails = JSON.parse(sessionStorage.getItem('bookingDetails'));
            if (!bookingDetails) {
                alert('Booking details not found. Please go back to the booking page.');
                window.location.href = '/booking';
            } else {
                console.log('Booking Details:', bookingDetails);
            }
        } catch (error) {
            console.error('Error validating booking details:', error);
            alert('An error occurred while validating your booking. Please go back to the booking page.');
            window.location.href = '/booking';
        }
    } else {
        alert('Session storage is not supported in your browser.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    populateUI();
    validateBookingDetails();
});