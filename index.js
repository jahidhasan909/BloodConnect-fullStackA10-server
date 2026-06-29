const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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





const JWKS = createRemoteJWKSet(new URL(process.env.JWKSUSER_URI))

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({ msg: "Unauthorized" });
    }



    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ msg: "Unauthorized" });
    }


    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;

        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ msg: "Unauthorized" });
    }
};










async function run() {
    try {
        // await client.connect();
        // await client.db("admin").command({ ping: 1 });

        const database = client.db(process.env.MONGODB_DB)
        const userCollaction = database.collection('usercollaction')
        const users = database.collection('user')
        const funding = database.collection('funding')
        const donationRequestCollaction = database.collection('donationrequestcollaction')


        const verifyRole = (...roles) => {
            return async (req, res, next) => {

                const email = req.user.email;

                const user = await userCollaction.findOne({ email });

                if (!user) {
                    return res.status(404).json({
                        message: "User not found"
                    });
                }

                if (!roles.includes(user.role)) {
                    return res.status(403).json({
                        message: "Forbidden"
                    });
                }

                req.dbUser = user;

                next();
            };
        };









        app.post('/api/users', async (req, res) => {
            const userdocs = req.body
            const result = await userCollaction.insertOne(userdocs)
            res.json(result)
        })
        app.post('/api/funding', async (req, res) => {
            const fundingdetails = req.body
            const result = await funding.insertOne(fundingdetails)
            res.json(result)
        })
        app.get('/api/funding', async (req, res) => {
            const cursor = await funding.find().toArray()
            res.json(cursor)
        })
        app.get('/api/pegination/funding', async (req, res) => {
            const { page = 1, limit = 10 } = req.query
            const skip = (Number(page) - 1) * Number(limit)


            const result = await funding.find().skip(skip).limit(Number(limit)).toArray()
            const totalData = await funding.countDocuments();
            const totalPage = Math.ceil(totalData / Number(limit));
            res.json({ data: result, page: Number(page), totalPage })
        })

        app.get('/api/users', async (req, res) => {
            const corsor = await userCollaction.find().toArray()
            res.json(corsor)
        })


        app.get('/api/own/users', async (req, res) => {
            const query = {}
            if (req.query.email) {
                query.email = req.query.email
            }
            const corsor = await userCollaction.findOne(query)
            res.json(corsor)
        })
        app.patch('/api/own/edit/users', verifyToken, async (req, res) => {
            const query = {}
            const updateData = req.body
            if (req.query.email) {
                query.email = req.query.email
            }
            const updateDocument = {
                $set: { ...updateData }
            }

            const corsor = await userCollaction.updateOne(query, updateDocument)
            const result = await users.updateOne({ email: req.query.email }, {
                $set: {
                    name: updateData.name,
                    image: updateData.image
                }
            })
            res.json({ corsor, result })
        })




        app.patch('/api/usercollaction/makeadmin', verifyToken, verifyRole('admin'), async (req, res) => {
            const query = {}
            if (req.query.email) {
                query.email = req.query.email
            }
            const updateDocument = {
                $set: {
                    role: 'admin'
                }
            }

            const result = await userCollaction.updateOne(query, updateDocument)
            const cursor = await users.updateOne({ email: req.query.email }, {
                $set: {
                    role: 'admin'
                }
            })
            res.json({ result, cursor })

        })
        app.patch('/api/usercollaction/makevolunteer', verifyToken, verifyRole('admin'), async (req, res) => {
            const query = {}
            if (req.query.email) {
                query.email = req.query.email
            }
            const updateDocument = {
                $set: {
                    role: 'volunteer'
                }
            }

            const result = await userCollaction.updateOne(query, updateDocument)
            const cursor = await users.updateOne({ email: req.query.email }, {
                $set: {
                    role: 'volunteer'
                }
            })
            res.json({ result, cursor })

        })

        app.patch('/api/usercollaction/makeblock', verifyToken, verifyRole('admin'), async (req, res) => {
            const query = {}
            if (req.query.email) {
                query.email = req.query.email
            }
            const updateDocument = {
                $set: {
                    status: 'blocked'
                }
            }

            const result = await userCollaction.updateOne(query, updateDocument)
            const cursor = await users.updateOne({ email: req.query.email }, {
                $set: {
                    status: 'blocked'
                }
            })
            res.json({ result, cursor })

        })
        app.patch('/api/usercollaction/unblocked', verifyToken, verifyRole('admin'), async (req, res) => {
            const query = {}
            if (req.query.email) {
                query.email = req.query.email
            }
            const updateDocument = {
                $set: {
                    status: 'active'
                }
            }

            const result = await userCollaction.updateOne(query, updateDocument)
            const cursor = await users.updateOne({ email: req.query.email }, {
                $set: {
                    status: 'active'
                }
            })
            res.json({ result, cursor })

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
        app.get('/api/donationrequest/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                _id: new ObjectId(id)
            }
            const cursor = await donationRequestCollaction.findOne(query)
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
        app.delete('/api/my/donationrequest/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                _id: new ObjectId(id)
            }

            const result = await donationRequestCollaction.deleteOne(query)
            res.json(result)

        })

        app.patch('/api/donationrequest/done/:id', verifyToken, verifyRole('admin', 'volunteer'), async (req, res) => {
            const id = req.params.id

            const fillter = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    donationStatus: 'done'
                }
            }

            const result = await donationRequestCollaction.updateOne(fillter, updateDocument)
            res.json(result)

        })
        app.patch('/api/donationrequest/canceled/:id', verifyToken, verifyRole('admin', 'volunteer'), async (req, res) => {
            const id = req.params.id


            const fillter = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    donationStatus: 'canceled'
                }
            }

            const result = await donationRequestCollaction.updateOne(fillter, updateDocument)
            res.json(result)

        })
        app.patch('/api/donationrequest/pending/:id', verifyToken, verifyRole('admin', 'volunteer'), async (req, res) => {
            const id = req.params.id


            const fillter = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    donationStatus: 'pending'
                }
            }

            const result = await donationRequestCollaction.updateOne(fillter, updateDocument)
            res.json(result)

        })
        app.patch('/api/donationrequest/inprogress/:id', verifyToken, verifyRole('admin', 'volunteer'), async (req, res) => {
            const id = req.params.id


            const fillter = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    donationStatus: 'inprogress'
                }
            }

            const result = await donationRequestCollaction.updateOne(fillter, updateDocument)
            res.json(result)

        })

        app.patch('/api/donationrequest/edit/:id', async (req, res) => {
            const id = req.params.id

            const updateData = req.body


            const fillter = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: { ...updateData }
            }

            const result = await donationRequestCollaction.updateOne(fillter, updateDocument)
            res.json(result)

        })
        app.get('/api/donationrequest/get/edit/:id', async (req, res) => {
            const id = req.params.id

            


            const fillter = { _id: new ObjectId(id) }


            const result = await donationRequestCollaction.findOne(fillter)
            res.json(result)

        })

        app.get('/api/my/pegination/donationrequest', async (req, res) => {
            const { page = 1, limit = 10 } = req.query
            const skip = (Number(page) - 1) * Number(limit)
            const query = {}

            if (req.query.requesterEmail) {
                query.requesterEmail = req.query.requesterEmail
            }
            const result = await donationRequestCollaction.find(query).skip(skip).limit(Number(limit)).toArray()
            const totalData = await donationRequestCollaction.countDocuments(query);
            const totalPage = Math.ceil(totalData / Number(limit));
            res.json({ data: result, page: Number(page), totalPage })
        })

        app.get('/api/volunteer/pegination/donationrequest', async (req, res) => {
            const { page = 1, limit = 10 } = req.query
            const skip = (Number(page) - 1) * Number(limit)


            const result = await donationRequestCollaction.find().skip(skip).limit(Number(limit)).toArray()
            const totalData = await donationRequestCollaction.countDocuments();
            const totalPage = Math.ceil(totalData / Number(limit));
            res.json({ data: result, page: Number(page), totalPage })
        })
        app.get('/api/admin/pegination/donationrequest', async (req, res) => {
            const { page = 1, limit = 10 } = req.query
            const skip = (Number(page) - 1) * Number(limit)


            const result = await donationRequestCollaction.find().skip(skip).limit(Number(limit)).toArray()
            const totalData = await donationRequestCollaction.countDocuments();
            const totalPage = Math.ceil(totalData / Number(limit));
            res.json({ data: result, page: Number(page), totalPage })
        })

        app.get('/api/pegination/users', async (req, res) => {
            const { page = 1, limit = 10 } = req.query
            const skip = (Number(page) - 1) * Number(limit)


            const result = await userCollaction.find().skip(skip).limit(Number(limit)).toArray()
            const totalData = await userCollaction.countDocuments();
            const totalPage = Math.ceil(totalData / Number(limit));
            res.json({ data: result, page: Number(page), totalPage })
        })

        app.patch('/api/donationrequest/:id', async (req, res) => {
            const id = req.params.id
            const updateone = req.body
            const query = {
                _id: new ObjectId(id)
            }
            const updateDocument = {
                $set: {
                    donationStatus: updateone.donationStatus,
                    donorName: updateone.donorName,
                    donorEmail: updateone.donorEmail
                }
            }
            const result = await donationRequestCollaction.updateOne(query, updateDocument)
            res.json(result)
        })



        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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