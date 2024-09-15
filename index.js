const express = require('express')
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 8000
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');


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
        app.get('/burger/:id', async (req, res) => {
            const { id } = req.params;
            try {
                // Convert the id from string to ObjectId
                const burger = await burgerCollection.findOne({ _id: new ObjectId(id) });

                if (!burger) {
                    return res.status(404).send({ message: "Burger not found" });
                }

                res.send(burger);
            } catch (error) {
                console.error("Error fetching burger:", error);
                res.status(500).send({ message: "Server error" });
            }
        });
        app.put('/editburger/:id', async (req, res) => {
            const { id } = req.params;
            const updatedBurgerData = req.body;

            try {
                // Remove _id from the updatedBurgerData if it exists
                const { _id, ...updateData } = updatedBurgerData;

                // Convert the id to ObjectId and find the burger to update
                const result = await burgerCollection.updateOne(
                    { _id: new ObjectId(id) },  // Find the burger by ObjectId
                    { $set: updateData }        // Update the burger data, excluding _id
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Burger not found" });
                }

                res.send({ message: "Burger updated successfully!" });
            } catch (error) {
                console.error("Error updating burger:", error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.delete('/burgers/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await burgerCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.status(200).send({ message: 'Product deleted successfully' });
                } else {
                    res.status(404).send({ message: 'Product not found' });
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                res.status(500).send({ message: 'Error deleting product' });
            }
        });



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

        // add burger post method
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