## TrustDine App This project is designed for AUT COMP826 Mobile System Development Year 2025

TrustDine is a cross-platform mobile app, using React Native + Node.js powered restaurant review platform built for food lovers in Auckland. It integrates Google Maps & TripAdvisor databases and store in Google SQL, performs intelligent scraping, and allows user-submitted reviews. The goal is to help users find the most trustworthy restaurants based on rating, location, and dish preferences.
Demo Display Youtube Intro: https://www.youtube.com/watch?v=lAuEq4cH3fE

---

## Features

- **Smart Restaurant Search**
  - Filter by region, dish type, distance, and rating
- **Google Maps Integration**
  - Uses lat/lng from Google Places API for accurate listings
- **Database Storage**
- Uses Google SQL to store the database
- **Restaurant Scraper Tool**
  - Built-in Node.js script to fetch restaurant metadata from Google
- **User Reviews**
  - Check User's GPS to secure the user within restaurant's region area and allow authorized user to rate for food, price, service, etc.
- **Admin-Approved Ratings**
  - Uses dual-source verification (Google + TripAdvisor)
- **Secure Authentication**
  - Sign up / login with hashed passwords and session tokens
- **Mobile-First Design**
  - Built with React Native and Material 3 UI theme (React Native Paper)

---

## Project Structure

All the files has been encrypted into ZIP, Pasword has been included in Project Summary.

```
TrustDine/
│
├── .expo/                 # Expo configuration
├── assets/                # Images, icons, etc.
├── components/            # Reusable UI components
├── screens/               # All UI screens (Login, Search, Profile, etc.)
│   ├── ForgotScreen.js
│   ├── LoginScreen.js
│   ├── SignUpScreen.js	   # Login/Sign-Up/Forgot Passwords Screens basically built for authorized access.	
│   ├── HomeScreen.js	   # TrustDine Start Point, user input Google formatted Address to search restaurant near the address
│   ├	└──SearchResultsScreen.js #Search Table: google_reviews and return search results from HomeScreen.js 
│   ├──  ReviewScreen.js
│   ├──  HistoryScreen.js   # Built for Admin only to approve user reviews and update tables stored in Google SQL	
│   └── ProfileScreen.js   # Easily update user's email address
├── restaurant-scraper/    # Node.js  !!!Important scraper module 1 (used for early-stage Google Map database construction, not running).
│   ├── index.js
│   └── package.json
├── tripadvisor-scraper/	# Node.js  !!!Important scraper module 2 (used for early-stage TripAdvisor database construction, not running).
├── trustdish-api/         # !!! Important Pattern Presenter: Live backend stored on GitHub and deployed via Render to handle user requests (Currently running).
├── App.js                 # Main entry point
├── regionPoints.js        # Database Scope Definition in Auckland region (16 main regions)
├── .env                   # Environment variables
├── package.json           # Frontend dependencies
├── Database Tables	   # Three main tables stored in Google Cloud SQL to record all the restaurant and user details
│   ├── CreateDB Four Tables Explaination.sql	# Explain How Four tables created and stored in Google SQL
│   ├──  Google_Reviews.csv			# Key table (Locked) to record data scraped from Google Map
│   ├──  Tripadvisor_TrustView.xlsx    # Key table to record and update data scraped from TripAdvisor
│   └──  User Reviews.xlsx				# Key table to store user upload review
└── TrustDine.apk	   # Andriod File, You can directly install it 100% virus free guarantee
└── README.md              # This file


---

## Database Structure

trustdine-DB/
│
├── google_reviews 		# Table 1, information extracted by using "restaurant-scraper", locked for review only. 
├── Tripadvisor_TrustView 	# Table 2, information partly extracted by using "restaurant-scraper", approved user reviews can update this table.
├── user_login			# Table 3, Store user info, can be update in ProfileScreen.js
├── User_Reviews		# Table 4, Store user new review info, will update Table 2 when Admin Approve. Update method: (New Review + Old Review * Old Review Numbers) / (Old Review Numbers +1)


## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- MySQL (Google Cloud SQL)
- Google Maps & Places API Key

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup `.env` (Already Exist, if not create one)

Create a `.env` file at the root:

```
GOOGLE_API_KEY=your_google_api_key
MYSQL_HOST=your_db_host
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database
```

### 3. Run React Native App

```bash
npx expo start
```

Scan QR code using Expo Go app on your phone (Or Best way to download this APP Android Version and testing by GitHub New Version Release or using below link).
https://expo.dev/accounts/gun101/projects/trustdine/builds/05e6856e-27d1-478f-b171-25d1df8f0a2e


### 4. Run Scraper (NOTE: the server related to Scraper is now disabled because free only support one server running)

```bash
cd restaurant-scraper
node index.js
```

---

## RUN TrustDine APP Screens in Visual Studio (NOTE: the server related to Scraper is now enabled 24/7 till 1/Dec/2025)
cd npx expo start

Screens include:
- `HomeScreen.js`: Filter restaurants by region, rating, dish type
- `SearchResultsScreen.js`: Table view of search results
- `ReviewScreen.js`: Submit reviews for each restaurant
- `SignUpScreen.js`, `LoginScreen.js`: User auth
- `ProfileScreen.js`, `HistoryScreen.js`

---

## Security Notes

- Passwords are hashed using `bcrypt`
- All API keys and DB credentials are managed via `.env`
- Frontend/backend communication secured via `HTTPS` (if deployed)

---

## Region Coverage

`regionPoints.js` contains a full mapping of Auckland sub-regions (e.g., CBD, Mount Eden, Newmarket) with 5-point lat/lng coverage per area. This ensures accurate coverage for API queries and map displays.

---

## Contributors

- Edison Hu – Developer, Architect, UI Designer
- GPT Assistant – Debugging for unsure error

---


## Feedback & Contact

For issues, bugs, or feedback, please open a GitHub issue or contact Edison via [hubaosen12@gmail.com]