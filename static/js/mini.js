function showMovieDetails(movieId) {
    const movieCard = document.getElementById(movieId);
    if (!movieCard) {
        console.error('Movie card not found:', movieId);
        return;
    }

    const movieTitle = movieCard.querySelector('.movie-title').innerText;
    const moviePoster = movieCard.querySelector('img').src;

    const movieDescription = "This is a sample description for " + movieTitle;
    const movieCast = "Sample Cast: Actor 1, Actor 2, Actor 3";

    document.getElementById('movie-detail-title').innerText = movieTitle;
    document.getElementById('movie-description').innerText = movieDescription;
    document.getElementById('movie-cast').innerText = movieCast;

    const posterElement = document.getElementById('movie-detail-poster');
    posterElement.src = moviePoster;
    posterElement.style.width = '50%';
    posterElement.style.height = 'auto';

    document.getElementById('movie-detail-modal').style.display = 'flex';
    sessionStorage.setItem('selectedMovie', movieTitle);
}

function closeMovieDetails() {
    document.getElementById('movie-detail-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.src = "{{ url_for('static', filename='image/placeholder.jpg') }}";
            console.error('Failed to load image:', this.src);
        };
    });

    const movieTitleElement = document.getElementById('movie-title');
    if (movieTitleElement) {
        const selectedMovie = sessionStorage.getItem('selectedMovie');
        if (selectedMovie) {
            movieTitleElement.value = selectedMovie;
        }
    }

    const theaterSelect = document.getElementById('theater-select');
    if (theaterSelect) {
        populateTheatersDropdown();
    }
});

function showBookingPage() {
    const selectedMovie = sessionStorage.getItem('selectedMovie');
    if (!selectedMovie) {
        alert('No movie selected. Please select a movie first.');
        return;
    }
    window.location.href = '/booking';
}

function closeBookingPage() {
    document.getElementById('booking-modal').style.display = 'none';
}

function confirmBooking() {
    closeBookingPage();
    window.location.href = '/seating';
}

function searchMovie() {
    const searchQuery = document.getElementById('movie-search').value.toLowerCase();
    const movies = document.querySelectorAll('.movie-card');
    
    let found = false;
    for (let movie of movies) {
        const movieTitle = movie.querySelector('.movie-title').textContent.toLowerCase();
        
        if (movieTitle.includes(searchQuery)) {
            movie.scrollIntoView({ behavior: 'smooth', block: 'center' });
            found = true;
            break;
        }
    }
    
    if (!found && searchQuery !== "") {
        alert("No movies found matching the search.");
    }
}

function toggleSearch() {
    const searchBox = document.getElementById('movie-search');
    if (searchBox.style.display === "none" || searchBox.style.display === "") {
        searchBox.style.display = "inline-block";
        searchBox.focus();
    } else {
        searchBox.style.display = "none";
    }
}

document.getElementById('movie-search').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        searchMovie();
    }
});

document.getElementById('book-now-btn').addEventListener('click', showBookingPage);

function populateTheatersDropdown() {
    const theaterSelect = document.getElementById('theater-select');
    fetch('/static/data/movie_theaters.json')
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Theater data loaded:', data);

            theaterSelect.innerHTML = '<option value="">-- Select a Theater --</option>';

            data.forEach(theater => {
                const option = document.createElement('option');
                option.value = theater.name;
                option.textContent = `${theater.name} (${theater.city})`;
                theaterSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading theater data:', error);
        });
}

function setMovieTitle(movieTitle) {
    const movieTitleInput = document.getElementById('movie-title');
    movieTitleInput.value = movieTitle;
}

function proceedToSeating() {
    const movieTitle = document.getElementById('movie-title').value;
    const theater = document.getElementById('theater-select').value;
    const date = document.getElementById('date-picker').value;
    const time = document.getElementById('time-slot').value;

    if (!theater || !date || !time) {
        alert('Please fill in all fields.');
        return;
    }

    sessionStorage.setItem('bookingDetails', JSON.stringify({ 
        movie: movieTitle, 
        theater: theater, 
        date: date, 
        time: time 
    }));

    window.location.href = '/seating';
}