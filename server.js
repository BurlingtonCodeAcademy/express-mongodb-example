//Necessary setup if you need to hide secure data
require("dotenv").config();
let user = process.env.USER_NAME; //accesses hidden data

//but for this we don't need any sensitive data

//import mongo connection class, and the constructor that will allow us to query by ID
const { MongoClient, ObjectId } = require("mongodb");

let dbClient = new MongoClient(`mongodb://localhost:27017`);

//Open a connection to our MongoDB server (used by all other database helper functions)
async function connect() {
  await dbClient.connect();

  let dataBase = await dbClient.db("test");
  let collection = await dataBase.collection("facts");

  return collection;
}


//Add a single entry to the DB
async function addDoc(docObj) {
  let coll = await connect();
  let returnVal = await coll.insertOne(docObj);
  //return success or failure message
  return returnVal;
}

//Reads all documents in the database
async function readAll() {
  let coll = await connect();

  let cursor = coll.find({});//gets a cursor (not an array yet)
  let allDocs = [];
  //for each on cursors is an async process, and we push entries to a real array
  await cursor.forEach((doc) => {
    allDocs.push(doc);
  });
  //return the actual array of data
  return allDocs;
}

//updates need both a target, and the updates to be applied
async function update(targetId, updateObj) {
  let coll = await connect();
  //Target ID needs to be in mongo ID format
  let mongoId = new ObjectId(targetId);
  //create update with atomic operator $set
  let updateVal = await coll.updateOne({ _id: mongoId }, { $set: updateObj });
  // return success or failure message
  return updateVal;
}

//Delete an entry
async function deleteEntry(targetId) {
  let coll = await connect();
  let mongoId = new ObjectId(targetId);

  let deleteVal = await coll.deleteOne({ _id: mongoId });
  console.log(deleteVal);
}

//express server setup
const express = require("express");
const app = express();
let port = process.env.PORT || 5000;

app.use(express.static("./public"));
app.use(express.urlencoded({ extended: true }));

//Creating routes for each CRUD operation
app.post("/create", async (req, res) => {
  let entry = req.body;

  let result = await addDoc(entry);
  dbClient.close();

  res.redirect("/facts");
});

app.get("/facts", async (req, res) => {
  let allFacts = await readAll();

  let page = `
  <ul>
    ${allFacts
      .map((fact) => {
        return `<li>
        <a href="/edit/${fact._id}"><i>${fact.author}</i>: ${fact.fact}</a>
        <a href="/delete/${fact._id}">X</a>
        </li>`;
      })
      .join("")}
    </ul>
  `;

  res.send(page);
});

app.get("/edit/:docId", (req, res) => {
  res.send(`
    <h1>Update your data</h1>
    <form method="post" action="/edit/${req.params.docId}">
      <input type="text" name="author" />
      <input type="text" name="fact" />
      <input type="submit" />
    </form>
    `);
});

app.post("/edit/:docId", async (req, res) => {
  let edited = await update(req.params.docId, req.body);
  res.redirect("/facts");
});

app.get("/delete/:docId", async (req, res) => {
  await deleteEntry(req.params.docId)

  res.redirect("/facts")
})

app.listen(port, () => {
  console.log("server is running... Better go catch it!");
});
