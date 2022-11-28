const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_PK)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { Stripe } = require('stripe')

const port = process.env.PORT || 5000;


const app = express();

//MiddleWare 
app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@fristusemongodb.yjaddi5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorization access');
    }

    // console.log(authHeader.split(" "));
    const token = authHeader.split(' ')[1];
    console.log(token);

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const usersCollection = client.db('deimStore').collection('users')
        const productsCollection = client.db('deimStore').collection('products')
        const categoryCollection = client.db('deimStore').collection('category')
        const bookingsCollection = client.db('deimStore').collection('booking')
        const paymentCollection = client.db('deimStore').collection('payment')


        app.get('/category', async (req, res) => {
            const query = {};
            const category = await categoryCollection.find(query).toArray();
            res.send(category)
        })


        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { category: id, soldStatus: 'unsold' };
            console.log(query);
            const category = await productsCollection.find(query).toArray();
            res.send(category)
        })

        //Advertise Product Load

        app.get('/advertise/product', async (req, res) => {
            const query = { soldStatus: 'unsold', advertise: 'true' };
            console.log(query);
            const product = await productsCollection.find(query).toArray();
            res.send(product)
        })

        //Reported Product Load
        app.get('/report/product', async (req, res) => {
            const query = { soldStatus: 'unsold', productReport: 'true' };
            console.log(query);
            const category = await productsCollection.find(query).toArray();
            res.send(category)
        })

        //Reported Product Load
        app.get('/categoryTitles', async (req, res) => {
            const query = {};
            const categoryTitles = await categoryCollection.find(query).project({ title: 1 }).toArray();
            res.send(categoryTitles)
        })

        //Payment API
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId;
            console.log(id);
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    tranjactionId: payment.tranjactionId
                }

            }
            const orderPaid = await bookingsCollection.updateOne(filter, updateDoc);
            console.log(orderPaid)

            res.send(result)
        })


        //Payment API

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const productPrice = booking.productPrice

            const amount = productPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                'payment_method_types': [
                    "card"
                ]
            });
            res.send({
                clientSecrete: paymentIntent.client_secret

            })
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        })

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' });
        })


        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })


        app.get('/dashboard/:role', async (req, res) => {
            const role = req.params.role;
            const query = { role };
            const user = await usersCollection.find(query).toArray();
            res.send(user);
        })



        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            res.send(result);
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })


        app.get('/dashboard/product/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) }
            const result = await bookingsCollection.findOne(query);
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            // const query = {
            //     productId: booking.productId,
            // }
            // const alreadyBooked = await bookingsCollection.find(query).toArray();


            // if (alreadyBooked.length) { 
            //     const message = `This Product already  booking`;
            //     return res.send({ acknowledged: false, message })
            // }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        app.post('/dashboard/addproduct', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })


        app.delete('/dashboard/buyer/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    advertise: 'true'
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        app.put('/productSoldStatus/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    soldStatus: 'sold'
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        app.put('/dashboard/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'verify'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        app.put('/productReportToAdmin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    productReport: 'true'
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })
        app.delete('/dashboard/seller/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}

run().catch(console.log)





app.get('/', (req, res) => {
    res.send('Drim Store Server Is Running');
})

app.listen(port, () => console.log(`Drim Store Server Running On ${port}`));