import { Request, Response, NextFunction } from "express";
import passport from "passport";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to authenticate using JWT
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate("jwt", { session: false }, (err: any, user: any) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized - Invalid or expired token",
      });
    }

    (req as AuthenticatedRequest).user = user;
    next();
  })(req, res, next);
};

// Optional JWT authentication - doesn't fail if no token provided
export const optionalAuthenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate("jwt", { session: false }, (err: any, user: any) => {
    if (err) {
      return next(err);
    }

    // If user is found, attach to request, otherwise continue without user
    if (user) {
      (req as AuthenticatedRequest).user = user;
    }

    next();
  })(req, res, next);
};

// Middleware to check if user has admin role
export const isAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    status: "error",
    message: "Forbidden - Admin access required",
  });
};

// Middleware to check if user has official role
export const isOfficial = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user && (req.user.role === "official" || req.user.role === "admin")) {
    return next();
  }

  return res.status(403).json({
    status: "error",
    message: "Forbidden - Official access required",
  });
};

// Middleware to check if user is the owner of the resource or an admin
export const isOwnerOrAdmin = (resourceField: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const resourceId = req.params[resourceField];

    if (
      req.user &&
      (req.user.role === "admin" || req.user.user_id === resourceId)
    ) {
      return next();
    }

    return res.status(403).json({
      status: "error",
      message: "Forbidden - You do not have permission to access this resource",
    });
  };
};
