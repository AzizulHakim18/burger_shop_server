const express = require('express')
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 8000
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



const app = express()

app.use(cors());
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
        const userCollection = client.db("burger_shop").collection("users")
        const reviewCollection = client.db("burger_shop").collection("reviews")


        // get all burgers
        app.get("/burgers", async (req, res) => {
            const cursor = burgerCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        // for pagination
        // get all burgers with pagination
        app.get("/burgerspagination", async (req, res) => {
            const page = parseInt(req.query.page) || 1; // default to page 1
            const limit = parseInt(req.query.limit) || 6; // default to 5 burgers per page
            const skip = (page - 1) * limit;

            try {
                const totalBurgers = await burgerCollection.countDocuments();
                const burgers = await burgerCollection.find().skip(skip).limit(limit).toArray();

                res.send({
                    burgers,
                    totalPages: Math.ceil(totalBurgers / limit),
                    currentPage: page
                });
            } catch (error) {
                res.status(500).send({ message: 'Error fetching burgers', error });
            }
        });

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

        // online payment
        // app.post('/onlinepayment', async (req, res) => {
        //     const { customerInfo, orderItems, paymentMethod, status, orderDate, token } = req.body;

        //     try {
        //         // Create Stripe charge (for actual payment)
        //         const charge = await stripe.charges.create({
        //             amount: orderItems.reduce((acc, item) => acc + item.price, 0) * 100,  // amount in cents
        //             currency: 'BDT',
        //             source: token.id,
        //             description: `Order for ${customerInfo.email}`
        //         });

        //         if (charge.status !== 'succeeded') {
        //             return res.status(400).send({ success: false, message: 'Payment failed' });
        //         }

        //         // Save order in the database
        //         const order = {
        //             customerInfo,
        //             orderItems,
        //             paymentMethod,
        //             status,
        //             orderDate,
        //         };

        //         const result = await orderCollection.insertOne(order);

        //         res.send({ success: true, order: result.ops[0] });
        //     } catch (error) {
        //         console.error('Error processing payment:', error);
        //         res.status(500).send({ success: false, message: 'Server error during payment processing' });
        //     }
        // });




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


        // Fetch orders by email (for customer-specific view)
        app.get("/admin/orders", async (req, res) => {
            const cursor = orderCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        });


        // Fetch orders by email (for customer-specific view)
        app.get("/admin/orders/:email", async (req, res) => {
            const email = req.params.email;
            const query = { "customerInfo.email": email };
            const orders = await orderCollection.find(query).toArray();
            res.json(orders);
        });


        // POST: Save a new review for a burger
        app.post('/reviews', async (req, res) => {
            const { burgerId, review, email } = req.body;
            try {
                const reviewDoc = {
                    burgerId,
                    review,
                    email,
                    createdAt: new Date(),
                };

                const result = await reviewCollection.insertOne(reviewDoc);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error saving review:', error);
                res.status(500).send({ message: 'Error saving review' });
            }
        });

        // Get reviews for a specific burger
        app.get('/reviews/:burgerId', async (req, res) => {
            const { burgerId } = req.params;
            try {
                const reviews = await reviewCollection.find({ burgerId }).toArray();
                res.send(reviews);
            } catch (error) {
                console.error('Error fetching reviews:', error);
                res.status(500).send({ message: 'Error fetching reviews' });
            }
        });



        app.put("/admin/orders/:id/status", async (req, res) => {
            const orderId = req.params.id;
            const { status } = req.body;

            try {
                const result = await orderCollection.updateOne(
                    { _id: new ObjectId(orderId) },  // Correct usage of ObjectId
                    { $set: { status } }             // Update the status field
                );

                if (result.matchedCount === 0) {
                    res.status(404).json({ success: false, message: "Order not found" });
                } else {
                    res.json({ success: true, message: "Order status updated", result });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: "Error updating order status", error });
            }
        });

        // Delete order
        app.delete("/admin/orders/:id", async (req, res) => {
            const orderId = req.params.id;
            try {
                const result = await orderCollection.deleteOne({ _id: new ObjectId(orderId) });
                res.json({ success: true, message: "Order deleted", result });
            } catch (error) {
                res.status(500).json({ success: false, message: "Error deleting order", error });
            }
        });



        // Add User
        app.post('/adduser', async (req, res) => {
            const { name, email, role, permissions, imageUrl } = req.body;
            try {
                const newUser = {
                    name,
                    email,
                    role,
                    permissions,
                    imageUrl // Handle image URLs or base64 strings here
                };

                // Insert user into the collection
                const result = await userCollection.insertOne(newUser);

                // Return the inserted user details
                res.status(201).send({
                    message: "User added successfully",
                    user: { _id: result.insertedId, ...newUser }
                });
            } catch (error) {
                console.error("Error adding user:", error);
                res.status(500).send({ message: "Server error" });
            }
        });


        // Get All Users
        app.get('/serviceusers', async (req, res) => {
            try {
                const users = await userCollection.find({}).toArray();
                res.send(users);
            } catch (error) {
                console.error("Error fetching users:", error);
                res.status(500).send({ message: "Server error" });
            }
        });


        // Delete a User by ID
        app.delete('/serviceusers/:id', async (req, res) => {
            const userId = req.params.id;
            try {
                const result = await userCollection.deleteOne({ _id: new ObjectId(userId) });

                if (result.deletedCount === 1) {
                    res.send({ message: 'User deleted successfully' });
                } else {
                    res.status(404).send({ message: 'User not found' });
                }
            } catch (error) {
                console.error("Error deleting user:", error);
                res.status(500).send({ message: "Server error" });
            }
        });



        // Backend: Get Sales Data
        app.get('/admin/sales', async (req, res) => {
            try {
                const orders = await orderCollection.find().toArray();

                // Process data to calculate total sales per day
                const salesData = orders.reduce((acc, order) => {
                    const orderDate = new Date(order.orderDate).toLocaleDateString();
                    const totalAmount = order.orderItems.reduce(
                        (sum, item) => sum + (item.price * item.quantity),
                        0
                    );
                    if (acc[orderDate]) {
                        acc[orderDate] += totalAmount;
                    } else {
                        acc[orderDate] = totalAmount;
                    }
                    return acc;
                }, {});

                res.json(Object.keys(salesData).map(date => ({ date, totalSales: salesData[date] })));
            } catch (error) {
                res.status(500).send('Error fetching sales data');
            }
        });



        // Backend: Get Product Sales Data
        app.get('/admin/sales/product', async (req, res) => {
            try {
                const orders = await orderCollection.find().toArray();

                // Aggregate sales by product
                const productSales = orders.reduce((acc, order) => {
                    order.orderItems.forEach(item => {
                        if (acc[item.name]) {
                            acc[item.name] += item.price * item.quantity;
                        } else {
                            acc[item.name] = item.price * item.quantity;
                        }
                    });
                    return acc;
                }, {});

                res.json(Object.keys(productSales).map(product => ({ product, totalSales: productSales[product] })));
            } catch (error) {
                res.status(500).send('Error fetching product sales data');
            }
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
    console.log("burger app is running on the port", port);
})