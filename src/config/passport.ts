import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import dotenv from "dotenv";
import pool from "./database";

dotenv.config();

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || "default_jwt_secret",
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload: any, done: any) => {
    try {
      const result = await pool.query(
        "SELECT user_id, email, role FROM users WHERE user_id = $1",
        [payload.user_id]
      );

      if (result.rows.length > 0) {
        return done(null, result.rows[0]);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

// OAuth2 Strategy (can be configured for specific providers)
const oauth2Options = {
  authorizationURL: "https://provider.example.com/oauth2/authorize",
  tokenURL: "https://provider.example.com/oauth2/token",
  clientID: process.env.OAUTH_CLIENT_ID || "default_client_id",
  clientSecret: process.env.OAUTH_CLIENT_SECRET || "default_client_secret",
  callbackURL:
    process.env.OAUTH_CALLBACK_URL || "http://localhost:5000/api/auth/callback",
};

passport.use(
  new OAuth2Strategy(
    oauth2Options,
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        // This would be customized based on the OAuth provider
        // For now, we'll just return a mock user
        return done(null, { id: "oauth-user", name: "OAuth User" });
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export default passport;
