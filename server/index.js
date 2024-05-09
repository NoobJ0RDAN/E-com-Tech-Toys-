const express = require("express");
const server = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Razorpay = require("razorpay");
require("dotenv").config();
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const cookieParser = require("cookie-parser");
const productsRouters = require("./routes/Products");
const brandsRouters = require("./routes/Brands");
const categoriesRouters = require("./routes/Categories");
const usersRouter = require("./routes/Users");
const authRouter = require("./routes/Auth");
const cartRouter = require("./routes/Cart");
const ordersRouter = require("./routes/Order");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const cors = require("cors");
const { isAuth, sanitizeUser, cookieExtractor } = require("./services/common");
const { User } = require("./models/User");
const parser = require("body-parser");
const urlencodedParser = parser.urlencoded({ extended: false });

const SECRET_KEY = "SECRET_KEY";
const opts = {};
opts.jwtFromRequest = cookieExtractor;
console.log(cookieExtractor());
opts.secretOrKey = SECRET_KEY;

server.use(parser.json());
server.use(urlencodedParser);
//server.use(express.raw({ type: "application/json" }));
server.use(express.static("build"));
server.use(
  cors({
    exposedHeaders: ["X-Total-Count"],
  })
);
server.use(cookieParser());
server.use(
  session({
    secret: "keyboard cat",
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);
server.use(passport.authenticate("session"));
server.use(express.json());
server.use("/products", isAuth(), productsRouters.router);
server.use("/brands", isAuth(), brandsRouters.router);
server.use("/categories", isAuth(), categoriesRouters.router);
server.use("/users", isAuth(), usersRouter.router);
server.use("/auth", authRouter.router);
server.use("/cart", isAuth(), cartRouter.router);
server.use("/orders", isAuth(), ordersRouter.router);

passport.use(
  "local",
  new LocalStrategy({ usernameField: "email" }, async function (
    username,
    password,
    done
  ) {
    // by default passport uses username
    try {
      const user = await User.findOne({ email: username });
      console.log(username, password, user);
      if (!user) {
        return done(null, false, { message: "invalid credentials" }); // for safety
      }
      crypto.pbkdf2(
        password,
        user.salt,
        310000,
        32,
        "sha256",
        async function (err, hashedPassword) {
          if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
            return done(null, false, { message: "invalid credentials" });
          }
          const token = jwt.sign(sanitizeUser(user), SECRET_KEY);
          done(null, { token }); // this lines sends to serializer
        }
      );
    } catch (err) {
      done(err);
    }
  })
);
passport.use(
  "jwt",
  new JwtStrategy(opts, async function (jwt_payload, done) {
    console.log("jwt", { jwt_payload });
    try {
      const user = await User.findById(jwt_payload.id);
      console.log(user);
      if (user) {
        return done(null, sanitizeUser(user)); // this calls serializer
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

passport.serializeUser(function (user, cb) {
  console.log("serialize", user);
  process.nextTick(function () {
    return cb(null, { id: user.id, role: user.role });
  });
});

passport.deserializeUser(function (user, cb) {
  console.log("de-serialize", user);
  process.nextTick(function () {
    return cb(null, user);
  });
});

// Payments

server.post("/payment", async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: "rzp_test_o3x026tpA9uDTw",
      key_secret: "JQCAUqDHPXEfLw5WRYM0zwA8",
    });

    const option = req.body;
    const ord = await razorpay.orders.create(option);

    if (!ord) {
      return res.status(500).send("Error");
    }
    res.json(ord);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Error");
  }
});

server.post("/payment/validate", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const sha = crypto.createHmac("sha256", "JQCAUqDHPXEfLw5WRYM0zwA8");
  sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = sha.digest("hex");
  if (digest !== razorpay_signature) {
    return res.status(400).json({ msg: "Transaction is not legit!" });
  }
  res.json({
    msg: "success",
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
});
// This is your test secret API key.
// const stripe = require("stripe")(
//   "sk_test_51P0TVqSIfW33ybYm1Fd4e8Tb87M9FQVJ4PZz18atY6opXCAYeF34hk8FVajaEnuKDHRTMJw0T6fZgENNvw7baFLF00vhIYHPxT"
// );

// server.post("/create-checkout-session", async (req, res) => {
//   const { products } = req.body;
// const lineItems = products.map((product) => ({
//   price_data: {
//     currency: "usd",
//     product_data: {
//       name: product.name,
//       images: [product.image],
//     },
//     unit_amount: Math.round(product.price * 100),
//   },
//   quantity: product.quantity,
// }));
//   const lineItems = {
//     price_data: {
//       currency: "usd",
//       product_data: {
//         name: "Iphone",
//         image: [],
//       },
//       unit_amount: 15000,
//     },
//     quantity: 1,
//   };
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     line_items: lineItems,
//     mode: "payment",
//     success_url: console.log("success"),
//     cancel_url: console.log("cancel"),
//   });
//   res.json({ id: session.id });
// });

// server.post("/create-payment-intent", async (req, res) => {
//   const { totalAmount } = req.body;

//   // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: totalAmount * 100, // for decimal compensation
//     currency: "inr",
//     automatic_payment_methods: {
//       enabled: true,
//     },
//   });

//   res.send({
//     clientSecret: paymentIntent.client_secret,
//   });
// });

// Webhook

// TODO: we will capture actual order after deploying out server live on public URL

// const endpointSecret =
//   "whsec_0e1456a83b60b01b3133d4dbe06afa98f384c2837645c364ee0d5382f6fa3ca2";

// server.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   (request, response) => {
//     const sig = request.headers["stripe-signature"];

//     let event;

//     try {
//       event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
//     } catch (err) {
//       response.status(400).send(`Webhook Error: ${err.message}`);
//       return;
//     }

//     // Handle the event
//     switch (event.type) {
//       case "payment_intent.succeeded":
//         const paymentIntentSucceeded = event.data.object;
//         console.log({ paymentIntentSucceeded });
//         // Then define and call a function to handle the event payment_intent.succeeded
//         break;
//       // ... handle other event types
//       default:
//         console.log(`Unhandled event type ${event.type}`);
//     }

//     // Return a 200 response to acknowledge receipt of the event
//     response.send();
//   }
// );

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb://127.0.0.1:27017/techtoys"
    // "mongodb+srv://jayrohit570:S0YF0CgPFobbjxCw@cluster0.mw9qq5j.mongodb.net/techtoys?retryWrites=true&w=majority&appName=Cluster0"
  );
  console.log("Database connected ");
}

server.get("/", (req, res) => {
  res.json({ status: "success" });
});

server.listen(8080, () => {
  console.log("server started");
});
