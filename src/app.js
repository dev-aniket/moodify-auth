import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.route.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import config from './confg/config.js';
import cors from 'cors';



const app = express();

const allowedOrigins = [
  "http://localhost:5173", // Keep this for local development
  "https://moodify-frontend-three.vercel.app" // You will get this URL from Vercel later
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true // Important for cookies/sessions
}));


app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());
// Configure Passport to use Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
    clientID: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
    // Here, you would typically find or create a user in your database
    // For this example, we'll just return the profile
    return done(null, profile);
}));


app.use('/api/auth', authRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});



export default app;