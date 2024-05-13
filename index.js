const express = require("express");
const app = express();
var cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://hotel-haven-c883c.web.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// verify jwt middleware
const logger = (req, res, next) =>{
  console.log('log: info', req.method, req.url);
  next();
}
 const verifyToken = (req, res, next) => {
   const token = req?.cookies?.token;
   if(!token){
    return res.status(401).send({message: 'unauthorized access'})
   }
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
     if(err){
      return res.status(401).send({message: 'unauthorized access'})
     }
     req.user = decoded;
     next();
   })
 }

// const uri = 'mongodb://localhost:27017';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5kgqkgx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const roomsCollection = client.db("hotelHavenDb").collection("rooms");

    // jwt generate
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // logout jwt
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // app.get("/rooms", async (req, res) => {
    //   const cursor = roomsCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });
    app.get("/rooms", async (req, res)=>{
      const {minPrice, maxPrice} = req.query;
      let filter = {}
      if(minPrice && maxPrice){
        filter = {price_per_night: {$gte: parseInt(minPrice), $lte: parseInt(maxPrice)}};
      }else if(minPrice){
        filter = {
          price_per_night : {$gte: parseInt(minPrice)}}
      }else if(maxPrice){{parseInt(maxPrice)}}
      const cursor = roomsCollection.find(filter);
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });
    app.put("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const availability = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: availability,
      };
      const result = await roomsCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    app.get("/myRoom/:email", logger, verifyToken, async (req, res) => {
      const email = req.params.email
      if(email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await roomsCollection
        .find({ email: email })
        .toArray();
      res.send(result);
    });

    app.patch("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const date = req.body;
      console.log(date.startDate);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { startDate: date.startDate },
        // $set: {...date},
      };
      const result = await roomsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.deleteOne(query);
      res.send(result);
    });

    // app.delete("/rooms/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const  availability = req.body;
    //   const query = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //         $set: {...availability} ,

    //       };
    //       const result = await roomsCollection.updateOne(query, updateDoc);
    //       const result2 = await roomsCollection.deleteOne(query);
    //   res.send({result, result2});
    // });


    app.get("/featuredRooms", async (req, res) => {
      const result = await roomsCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/featuredRooms", async (req, res) => {
      const result = await roomsCollection.find().limit(6).toArray();
      res.send(result);
    });

    // review collection
    app.get("/review", async (req, res) => {
      try {
        const pipeline = [
          {
            $unwind: "$reviews",
          },
          {
            $sort: { "reviews.timestamp": -1 },
          },
          {
            $group: {
              _id: null,
              reviews: { $push: "$reviews" },
            },
          },
          {
            $project: {
              _id: 0,
              reviews: 1,
            },
          },
        ];

        const result = await roomsCollection.aggregate(pipeline).toArray();
        if (result.length > 0) {
          res.json(result[0].reviews);
        } else {
          res.json([]);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        res
          .status(500)
          .json({
            success: false,
            message: "An error occurred while fetching reviews",
          });
      }
    });

    app.put("/review/:id", async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $push: { reviews: { $each: [item] } },
      };
      const result = await roomsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hotel Haven is Running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
