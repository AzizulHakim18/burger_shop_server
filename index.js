const express = require('express')
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 8000
const { MongoClient, ServerApiVersion } = require('mongodb');


const app = express()
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wlrow.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
        await client.connect();


        const burgerCollection = client.db("burger_shop").collection("burgers")
        const orderCollection = client.db("burger_shop").collection("orders")


        // get all burgers
        app.get("/burgers", async (req, res) => {
            const cursor = burgerCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        // Endpoint to get orders by email
        app.get('/orders', async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.status(400).send({ message: "Email query parameter is required" });
            }

            try {
                const orders = await orderCollection.find({ "customerInfo.email": email }).toArray();

                if (orders.length === 0) {
                    return res.status(404).send({ message: "No orders found for this email" });
                }

                res.send(orders);
            } catch (error) {
                console.error("Error fetching orders:", error);
                res.status(500).send({ message: "Server error, unable to fetch orders" });
            }
        });

        app.post('/addburger', async (req, res) => {
            const burger = req.body;
            try {
                const result = await burgerCollection.insertOne(burger);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error adding burger:', error);
                res.status(500).send({ message: 'Error adding burger' });
            }
        });
        // POST: Save new order
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get("/", (req, res) => {
    res.send("opening burger shop")
})

app.listen(port, () => {
    console.log("burger app is running on the port");
})