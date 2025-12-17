// Weather App JavaScript
class WeatherApp {
    constructor() {
        this.apiKey = 'a10607c150d16a7704ce43861fb2fd61'; 
        this.baseURL = 'https://api.openweathermap.org/data/2.5';
        this.geoURL = 'https://api.openweathermap.org/geo/1.0';

        this.locationInput = document.getElementById('location-input');
        this.searchBtn = document.getElementById('search-btn');
        this.currentLocationBtn = document.getElementById('current-location-btn');
        this.currentWeatherDiv = document.getElementById('current-weather');
        this.forecastContainer = document.getElementById('forecast-container');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDefaultWeather();
    }

    setupEventListeners() {
        this.searchBtn.addEventListener('click', () => this.searchWeather());
        this.locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWeather();
            }
        });
        this.currentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
    }

    async loadDefaultWeather() {
        // Try to get weather for a default city (London)
        try {
            console.log('Loading default weather for London...');
            await this.getWeatherByCity('London');
            console.log('Default weather loaded successfully');
        } catch (error) {
            console.error('Error loading default weather:', error);
            this.showError('Unable to load weather data. Please search for a city.');
        }
    }

    async searchWeather() {
        const location = this.locationInput.value.trim();
        if (!location) {
            this.showError('Please enter a city name or zip code.');
            return;
        }

        try {
            this.showLoading();
            await this.getWeatherByCity(location);
        } catch (error) {
            this.showError('City not found. Please check the spelling and try again.');
        }
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            return;
        }

        this.showLoading();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    await this.getWeatherByCoords(latitude, longitude);
                } catch (error) {
                    this.showError('Unable to get weather for your location.');
                }
            },
            () => {
                this.showError('Unable to get your location. Please allow location access.');
            }
        );
    }

    async getWeatherByCity(city) {
        // First get coordinates for the city
        console.log(`Searching for city: ${city}`);
        const geoResponse = await fetch(
            `${this.geoURL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${this.apiKey}`
        );

        console.log(`Geocoding response status: ${geoResponse.status}`);
        if (!geoResponse.ok) {
            throw new Error('City not found');
        }

        const geoData = await geoResponse.json();

        if (geoData.length === 0) {
            throw new Error('City not found');
        }

        const { lat, lon, name, country } = geoData[0];
        await this.getWeatherByCoords(lat, lon, `${name}, ${country}`);
    }

    async getWeatherByCoords(lat, lon, locationName = null) {
        // Get current weather
        const currentWeatherResponse = await fetch(
            `${this.baseURL}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
        );

        // Get 5-day forecast
        const forecastResponse = await fetch(
            `${this.baseURL}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
        );

        if (!currentWeatherResponse.ok || !forecastResponse.ok) {
            throw new Error('Weather data not available');
        }

        const currentWeather = await currentWeatherResponse.json();
        const forecast = await forecastResponse.json();

        this.displayWeather(currentWeather, forecast, locationName);
        this.addWeatherAnimations();
    }

    addWeatherAnimations() {
        // Add CSS classes for animations dynamically
        setTimeout(() => {
            const weatherCard = document.querySelector('.weather-card');
            const forecastCards = document.querySelectorAll('.forecast-card');

            if (weatherCard) {
                weatherCard.style.animation = 'bounceIn 0.8s ease-out';
            }

            forecastCards.forEach((card, index) => {
                card.style.animation = `bounceIn 0.8s ease-out ${0.2 * index}s both`;
            });

            // Add click animations
            const detailItems = document.querySelectorAll('.detail-item');
            detailItems.forEach((item, index) => {
                item.style.animation = `slideInLeft 0.6s ease-out ${0.1 * index}s both`;
            });
        }, 100);
    }

    displayWeather(currentWeather, forecast, customLocation = null) {
        // Display current weather
        const locationName = customLocation || `${currentWeather.name}, ${currentWeather.sys.country}`;

        const weatherHTML = `
            <div class="weather-card">
                <div class="weather-main">
                    <div class="weather-info">
                        <h2>${locationName}</h2>
                        <div class="temperature">${Math.round(currentWeather.main.temp)}°C</div>
                        <div class="weather-desc">${currentWeather.weather[0].description}</div>
                    </div>
                    <div class="weather-details">
                        <div class="detail-item">
                            <div class="value">${currentWeather.main.humidity}%</div>
                            <div class="label">Humidity</div>
                        </div>
                        <div class="detail-item">
                            <div class="value">${Math.round(currentWeather.wind.speed * 3.6)} km/h</div>
                            <div class="label">Wind Speed</div>
                        </div>
                        <div class="detail-item">
                            <div class="value">${Math.round(currentWeather.main.feels_like)}°C</div>
                            <div class="label">Feels Like</div>
                        </div>
                        <div class="detail-item">
                            <div class="value">${currentWeather.main.pressure} hPa</div>
                            <div class="label">Pressure</div>
                        </div>
                    </div>
                </div>
                <div class="weather-icon">
                    <i class="${this.getWeatherIcon(currentWeather.weather[0].main)}"></i>
                </div>
            </div>
        `;

        this.currentWeatherDiv.innerHTML = weatherHTML;

        // Display forecast
        this.displayForecast(forecast);
    }

    displayForecast(forecast) {
        // Group forecast by day (API returns 3-hour intervals)
        const dailyForecasts = {};
        const today = new Date().toDateString();

        forecast.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();

            // Skip today for forecast (we show current weather separately)
            if (dateKey === today) return;

            if (!dailyForecasts[dateKey]) {
                dailyForecasts[dateKey] = {
                    date: date,
                    temps: [],
                    weather: item.weather[0],
                    main: item.weather[0].main
                };
            }

            dailyForecasts[dateKey].temps.push(item.main.temp);
        });

        // Take first 5 days
        const forecastDays = Object.values(dailyForecasts).slice(0, 5);

        const forecastHTML = forecastDays.map(day => {
            const maxTemp = Math.max(...day.temps);
            const minTemp = Math.min(...day.temps);
            const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return `
                <div class="forecast-card">
                    <div class="forecast-date">${dayName}, ${dateStr}</div>
                    <div class="forecast-icon">
                        <i class="${this.getWeatherIcon(day.main)}"></i>
                    </div>
                    <div class="forecast-temp">${Math.round(maxTemp)}°/${Math.round(minTemp)}°</div>
                    <div class="forecast-desc">${day.weather.description}</div>
                </div>
            `;
        }).join('');

        this.forecastContainer.innerHTML = forecastHTML;
    }

    getWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': 'fas fa-sun',
            'Clouds': 'fas fa-cloud',
            'Rain': 'fas fa-cloud-rain',
            'Drizzle': 'fas fa-cloud-rain',
            'Thunderstorm': 'fas fa-bolt',
            'Snow': 'fas fa-snowflake',
            'Mist': 'fas fa-smog',
            'Fog': 'fas fa-smog',
            'Haze': 'fas fa-smog'
        };

        return iconMap[weatherMain] || 'fas fa-cloud';
    }

    showLoading() {
        this.currentWeatherDiv.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading weather data...</p>
            </div>
        `;
    }

    showError(message) {
        this.currentWeatherDiv.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
        this.forecastContainer.innerHTML = '';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});

// Instructions for getting API key
console.log(`
🌤️ Weather App Setup Instructions:

1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Get your API key from the dashboard
4. Replace 'YOUR_OPENWEATHERMAP_API_KEY' in script.js with your actual API key

❌ CURRENT STATUS: API key is invalid - weather data won't load
✅ The app will work once you add a valid API key!

To test your API key, you can run this in browser console:
fetch('https://api.openweathermap.org/geo/1.0/direct?q=London&limit=1&appid=YOUR_API_KEY')
  .then(r => r.json())
  .then(d => console.log('API test result:', d))
`);
