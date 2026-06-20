const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 8000


app.use(cors());
app.use(express.json())




const uri = process.env.MONGODB_URI

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });

        const database = client.db(process.env.MONGODB_DB)
        const userCollaction = database.collection('usercollaction')
        const donationRequestCollaction = database.collection('donationrequestcollaction')


        app.post('/api/users', async (req, res) => {
            const userdocs = req.body
            const result = await userCollaction.insertOne(userdocs)
            res.json(result)
        })
        app.post('/api/donationrequest', async (req, res) => {
            const requestdocs = req.body
            const result = await donationRequestCollaction.insertOne(requestdocs)
            res.json(result)
        })


        app.get('/api/donationrequest', async (req, res) => {
            const cursor = await donationRequestCollaction.find().toArray()
            res.json(cursor)
        })


        app.get('/api/my/donationrequest', async (req, res) => {

            const query = {}

            if (req.query.requesterEmail) {
                query.requesterEmail = req.query.requesterEmail
            }
            const result = await donationRequestCollaction.find(query).toArray()
            res.json(result)

        })



        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})