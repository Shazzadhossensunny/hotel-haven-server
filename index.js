const express = require('express');
const app = express();
var cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var cookieParser = require('cookie-parser');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://hotel-haven-c883c.web.app/',
    ],
    credentials: true,
    optionSuccessStatus: 200,
  }
app.use(cors(corsOptions))
app.use(express.json());
app.use(cookieParser())

// const uri = 'mongodb://localhost:27017';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5kgqkgx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const roomsCollection = client.db('hotelHavenDb').collection('rooms')

    app.get("/rooms", async(req, res)=>{
        const cursor = roomsCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })
    app.get("/rooms/:id", async(req, res)=> {
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await roomsCollection.findOne(query)
        res.send(result)
    })
   app.put("/rooms/:id", async(req, res)=>{
    const id = req.params.id;
    const availability = req.body;
    const query = {_id : new ObjectId(id)}
    const option = {upsert: true}
    const updateDoc = {
        $set: availability,
    }
    const result = await roomsCollection.updateOne(query, updateDoc, option)
    res.send(result)

   })


   app.get("/myRoom/:email", async(req, res)=>{
     const result = await roomsCollection.find({ email: req.params.email}).toArray()
     res.send(result)
   })

   app.patch("/rooms/:id", async(req, res)=>{
    const id = req.params.id;
    console.log(id)
    const date = req.body;
    console.log(date.startDate)
    const query = {_id : new ObjectId(id)}
    const updateDoc = {
        $set: {startDate: date.startDate},
        // $set: {...date},
    }
    const result = await roomsCollection.updateOne(query, updateDoc)
    res.send(result)

   })

   app.delete("/rooms/:id", async(req, res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await roomsCollection.deleteOne(query)
    res.send(result)
   })
    app.get("/featuredRooms", async(req, res)=>{
        const result = await roomsCollection.find().limit(6).toArray()
        res.send(result)
    })


    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hotel Haven is Running')
  })

  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })