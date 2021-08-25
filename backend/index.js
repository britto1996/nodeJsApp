const express = require("express");
const app = express();
require("dotenv").config();
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const refreshTokens = [];
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const JWT_AUTH_TOKEN = process.env.JWT_AUTH_TOKEN;
const JWT_REFRESH_TOKEN = process.env.JWT_REFRESH_TOKEN;
const smsKey = process.env.SMS_SECRET_KEY;
const connectDB = require("./config/db");
const userRoute = require("./route/user");
const port = process.env.PORT || 8000;

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use("/api/users", userRoute);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/sendOTP", (req, res) => {
  const phone = req.body.phone;
  const otp = Math.floor(100000 + Math.random() * 900000);
  const ttl = 2 * 60 * 1000;
  const expires = Date.now() + ttl;
  const data = `${phone}.${otp}.${expires}`;
  const hash = crypto.createHmac("sha256", smsKey).update(data).digest("hex");
  const fullHash = `${hash}.${expires}`;

  client.messages
    .create({
      body: `Your one time login password is ${otp}`,
      from: process.env.PHONE,
      to: phone,
    })
    .then((messages) => console.log(messages))
    .catch((err) => console.error(err));

  res.status(200).send({ phone, hash: fullHash, otp });
});

app.post("/verifyOTP", (req, res) => {
  const phone = req.body.phone;
  const hash = req.body.hash;
  const otp = req.body.otp;
  let [hashValue, expires] = hash.split(".");

  let now = Date.now();
  if (now > parseInt(expires)) {
    return res.status(504).send({ msg: `Timeout please try again` });
  }
  const data = `${phone}.${otp}.${expires}`;
  const newCalculatedHash = crypto
    .createHmac("sha256", smsKey)
    .update(data)
    .digest("hex");

  if (newCalculatedHash === hashValue) {
    console.log(`user confirmed`);
    const accessToken = jwt.sign({ data: phone }, JWT_AUTH_TOKEN, {
      expiresIn: "30s",
    });
    const refreshToken = jwt.sign({ data: phone }, JWT_REFRESH_TOKEN, {
      expiresIn: "1y",
    });
    refreshTokens.push(refreshToken);
    res
      .status(202)
      .cookie("accessToken", accessToken, {
        expires: new Date(new Date().getTime() + 30 * 1000),
        sameSite: "strict",
        httpOnly: true,
      })
      .cookie("refreshToken", refreshToken, {
        expires: new Date(new Date().getTime() + 3557600000),
        sameSite: "strict",
        httpOnly: true,
      })
      .cookie("authSession", true, {
        expires: new Date(new Date().getTime() + 30 * 1000),
      })
      .cookie("refreshTokenId", true, {
        expires: new Date(new Date().getTime() + 3557600000),
      })
      .send({ msg: `Device Verified` });
  } else {
    return res.status(400).send({ verification: false, msg: `Incorrect OTP` });
  }
});

app.post("/home", authenticateUser, (req, res) => {
  console.log("home private route");
  res.status(202).send("Private Protected Route - Home");
});

async function authenticateUser(req, res, next) {
  const accessToken = req.cookies.accessToken;
  jwt.verify(accessToken, JWT_AUTH_TOKEN, async (err, phone) => {
    if (phone) {
      req.phone = phone;
      next();
    } else if (err.message === "TokenExpiredError") {
      return res
        .status(403)
        .send({ success: false, msg: `Access token expired` });
    } else {
      console.error(err);
      res.status(403).send({ err, msg: `user not authenticated` });
    }
  });
}

app.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res
      .status(403)
      .send({ msg: `refresh token not found,please login again` });
  }
  if (!refreshTokens.includes(refreshToken)) {
    return res
      .status(403)
      .send({ msg: `Refresh token blocked, please login again` });
  }

  jwt.verify(refreshToken, JWT_REFRESH_TOKEN, (err, phone) => {
    if (!err) {
      const accessToken = jwt.sign({ data: phone }, JWT_AUTH_TOKEN, {
        expiresIn: "30s",
      });
      return res
        .status(200)
        .cookie("accessToken", accessToken, {
          expires: new Date(new Date().getTime() + 30 * 1000),
          sameSite: "strict",
          httpOnly: true,
        })
        .cookie("authSession", true, {
          expires: new Date(new Date().getTime() + 30 * 1000),
        })
        .send({ previousSessionExpiry: true, success: true });
    } else {
      return res
        .status(403)
        .send({ success: false, msg: `Invalid refresh token` });
    }
  });
});

app.get("/logout", (req, res) => {
  res
    .clearCookie("refreshToken")
    .clearCookie("accessToken")
    .clearCookie("authSession")
    .clearCookie("refreshTokenId")
    .send(`user logged out successfully`);
});

app.listen(port, () => {
  console.log(`Server running on localhost:${port}`);
});
