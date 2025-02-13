const express = require('express');
const hbs = require('hbs');
const { createConnection } = require('mysql2/promise');

const wax = require('wax-on'); // <-- template inheritance
require('dotenv').config();

// create an express application
const app = express();

// set hbs
app.set('view engine', 'hbs'); // we're using hbs as the view engine
wax.on(hbs.handlebars);
wax.setLayoutPath('./views/layouts'); // tell wax-on where to the find the layout files
// layout files are hbs files that have elements which can be shared among other hbs files

let connection = null; // create an empty variable named connection

// setup form processing
app.use(express.urlencoded({
    extended: false
}))

async function main() {
    // creating a connect is an asynchronous operation
    // -> an async operation is one where NodeJS won't wait for it to finish
    // before executing the next line of code
    connection = await createConnection({
        'host': 'localhost',
        'user': 'root',
        'database': 'crm',
        'password': ''
    });  // createConnection takes a long time to finish
    // usually JS will just skip this line and move on to the next
    // but we don't want so we use await to make sure the connection finishes
    // creating before moving on to the next line

    // we want the connection to the database to be finished before defining the routes

    app.get("/", function (req, res) {
        res.render('home')
    });

    app.get('/test', function (req, res) {
        res.render('test-file');
    });

    app.get('/customers', async function (req, res) {
        // const results = await connection.execute(`
        //     SELECT * FROM Customers
        //         JOIN Companies
        //     ON Customers.company_id = Companies.company_id;
        // `);
        // const customers = results[0];
        
        // Use array destructuring to extract out the first element of the
        // results array into the customers array
        const [customers] = await connection.execute(`
            SELECT * FROM Customers
                JOIN Companies
            ON Customers.company_id = Companies.company_id;
        `);
  

        res.render('customers', {
            'allCustomers': customers
        })

    });

    // one route to display the form
    // one route to process the form
    app.get('/customers/add', async function(req,res){
        // const results = await connection.execute("SELECT * FROM Companies");
        // const companies = results[0];

        const [companies] = await connection.execute("SELECT * FROM Companies");

        res.render('create-customer', {
            'companies': companies
        });
    });

    app.post('/customers/add', async function(req,res) {
        // to extract data from a form, we will
        // use the name of the field as a key in req.body
        const firstName = req.body.first_name;
        const lastName = req.body.last_name;
        const rating = req.body.rating;
        const companyId = req.body.company_id;

        const bindings = [firstName, lastName, rating, companyId]

        // use a prepared statement to insert rows -- a secured way to prevent MySQL injection attacks
        await connection.execute(`INSERT INTO Customers (first_name, last_name, rating, company_id)
  VALUES (?, ?, ?, ? );`, bindings);

  // tell the browser to go a different URL
        res.redirect("/customers");
    })

}
main();






// start the server
app.listen(3000, function () {
    console.log("Server has started")
})

